using System.Globalization;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SICST.Application.Common.Models;

namespace SICST.Infrastructure.Arca;

public class PadronA5Client
{
    private static readonly XNamespace SoapEnv = "http://schemas.xmlsoap.org/soap/envelope/";
    private static readonly XNamespace A5Ns = "http://a5.sr-padron.soap.afip.gov.ar/";
    private static readonly XNamespace A13Ns = "http://a13.soap.ws.server.puc.sr/";

    private readonly HttpClient _httpClient;
    private readonly TicketAccesoManager _taManager;
    private readonly ArcaOptions _options;
    private readonly ILogger<PadronA5Client> _logger;

    public PadronA5Client(
        HttpClient httpClient,
        TicketAccesoManager taManager,
        IOptions<ArcaOptions> options,
        ILogger<PadronA5Client> logger)
    {
        _httpClient = httpClient;
        _taManager = taManager;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ArcaTaxpayerData> GetPersonaAsync(long cuit, CancellationToken ct)
    {
        var ta = await _taManager.GetTicketAccesoAsync(ct);
        var representedCuit = _options.GetRepresentedCuit();
        if (representedCuit <= 0)
        {
            throw new InvalidOperationException("Arca:Cuit debe configurarse con el CUIT representado por el certificado.");
        }

        var useA13 = string.Equals(_options.PadronVersion, "A13", StringComparison.OrdinalIgnoreCase);
        var soapRequest = useA13
            ? BuildA13SoapEnvelope(cuit, representedCuit, ta.Token, ta.Sign)
            : BuildA5SoapEnvelope(cuit, representedCuit, ta.Token, ta.Sign);
        var url = _options.GetEffectivePadronUrl();

        _logger.LogDebug("Querying ARCA Padron {Version} for CUIT {Cuit}", useA13 ? "A13" : "A5", cuit);

        using var content = new StringContent(soapRequest, Encoding.UTF8, "text/xml");
        content.Headers.Add("SOAPAction", "");
        using var response = await _httpClient.PostAsync(url, content, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            var detail = ExtractSoapFault(responseBody);
            _logger.LogError(
                "ARCA Padron {Version} returned {StatusCode} for CUIT {Cuit}. Response body: {Body}",
                useA13 ? "A13" : "A5",
                response.StatusCode,
                cuit,
                responseBody);
            throw new InvalidOperationException(
                $"ARCA Padrón {(_options.PadronVersion ?? "A5").ToUpperInvariant()} rechazó la consulta: {detail}");
        }

        return useA13
            ? ParseA13PersonaResponse(responseBody)
            : ParseA5PersonaResponse(responseBody);
    }

    private static string BuildA5SoapEnvelope(long cuit, long representedCuit, string token, string sign)
    {
        var doc = new XDocument(
            new XElement(SoapEnv + "Envelope",
                new XAttribute(XNamespace.Xmlns + "soap", SoapEnv),
                new XAttribute(XNamespace.Xmlns + "xsi", "http://www.w3.org/2001/XMLSchema-instance"),
                new XAttribute(XNamespace.Xmlns + "xsd", "http://www.w3.org/2001/XMLSchema"),
                new XElement(SoapEnv + "Header",
                    new XElement(A5Ns + "authHeader",
                        new XElement("token", token),
                        new XElement("sign", sign),
                        new XElement("cuitRepresentada", representedCuit.ToString()))),
                new XElement(SoapEnv + "Body",
                    new XElement(A5Ns + "getPersona_v2",
                        new XElement("idPersona", cuit.ToString())))));

        return doc.ToString(SaveOptions.DisableFormatting);
    }

    private static string BuildA13SoapEnvelope(long cuit, long representedCuit, string token, string sign)
    {
        var doc = new XDocument(
            new XElement(SoapEnv + "Envelope",
                new XAttribute(XNamespace.Xmlns + "soap", SoapEnv),
                new XAttribute(XNamespace.Xmlns + "xsi", "http://www.w3.org/2001/XMLSchema-instance"),
                new XAttribute(XNamespace.Xmlns + "xsd", "http://www.w3.org/2001/XMLSchema"),
                new XElement(SoapEnv + "Body",
                    new XElement(A13Ns + "getPersona",
                        new XElement("token", token),
                        new XElement("sign", sign),
                        new XElement("cuitRepresentada", representedCuit.ToString()),
                        new XElement("idPersona", cuit.ToString())))));

        return doc.ToString(SaveOptions.DisableFormatting);
    }

    private static ArcaTaxpayerData ParseA5PersonaResponse(string soapXml)
    {
        var doc = XDocument.Parse(soapXml);

        var returnElement = doc
            .Descendants(A5Ns + "return")
            .FirstOrDefault();

        if (returnElement is null)
            throw new InvalidOperationException("Padron A5 response did not contain a return element.");

        var errorMsg = returnElement
            .Element("mensajeError")?
            .Value;

        if (!string.IsNullOrEmpty(errorMsg))
        {
            return new ArcaTaxpayerData
            {
                Cuit = 0,
                MensajeError = errorMsg.Trim()
            };
        }

        var idPersona = (long?)returnElement.Element("idPersona") ?? 0;
        var tipoPersona = (string?)returnElement.Element("tipoPersona") ?? string.Empty;
        var estadoClave = (string?)returnElement.Element("estadoClave") ?? string.Empty;
        var razonSocial = (string?)returnElement.Element("razonSocial") ?? string.Empty;
        var nombre = (string?)returnElement.Element("nombre") ?? string.Empty;
        var apellido = (string?)returnElement.Element("apellido") ?? string.Empty;

        var datosGenerales = returnElement.Element("datosGenerales");
        var fiscalAddress = ParseFiscalAddress(datosGenerales);

        var datosRegimenGeneral = returnElement.Element("datosRegimenGeneral");
        var ivaCondition = ParseIvaCondition(datosRegimenGeneral);
        var activities = ParseEconomicActivities(datosRegimenGeneral);
        var monotributo = ParseMonotributoCategory(datosRegimenGeneral);
        var employeeCount = ParseEmployeeCount(datosRegimenGeneral);

        return new ArcaTaxpayerData
        {
            Cuit = idPersona,
            PersonType = tipoPersona.Trim(),
            KeyStatus = estadoClave.Trim(),
            BusinessName = razonSocial.Trim(),
            FirstName = nombre.Trim(),
            LastName = apellido.Trim(),
            FiscalAddress = fiscalAddress,
            IvaCondition = ivaCondition.condition,
            IvaConditionId = ivaCondition.id,
            EconomicActivities = activities,
            MonotributoCategory = monotributo,
            EmployeeCount = employeeCount
        };
    }

    private static string ExtractSoapFault(string soapXml)
    {
        try
        {
            var doc = XDocument.Parse(soapXml);
            var fault = doc
                .Descendants(SoapEnv + "Fault")
                .Elements("faultstring")
                .FirstOrDefault()
                ?.Value;

            if (!string.IsNullOrWhiteSpace(fault))
            {
                return fault.Trim();
            }

            var mensajeError = doc
                .Descendants("mensajeError")
                .FirstOrDefault()
                ?.Value;

            if (!string.IsNullOrWhiteSpace(mensajeError))
            {
                return mensajeError.Trim();
            }
        }
        catch
        {
            // If ARCA returns non-XML, include a compact generic message below.
        }

        return "respuesta no exitosa del servicio de padrón.";
    }

    private static ArcaTaxpayerData ParseA13PersonaResponse(string soapXml)
    {
        var doc = XDocument.Parse(soapXml);
        var persona = doc
            .Descendants(A13Ns + "persona")
            .FirstOrDefault() ??
            doc.Descendants("persona").FirstOrDefault();

        if (persona is null)
        {
            var fault = doc.Descendants(SoapEnv + "Fault").Elements("faultstring").FirstOrDefault()?.Value;
            return new ArcaTaxpayerData
            {
                Cuit = 0,
                MensajeError = string.IsNullOrWhiteSpace(fault)
                    ? "La respuesta de Padrón A13 no contiene datos de persona."
                    : fault.Trim()
            };
        }

        var idPersona = (long?)persona.Element("idPersona") ?? 0;
        var estadoClave = ((string?)persona.Element("estadoClave") ?? string.Empty).Trim();
        var razonSocial = ((string?)persona.Element("razonSocial") ?? string.Empty).Trim();
        var nombre = ((string?)persona.Element("nombre") ?? string.Empty).Trim();
        var apellido = ((string?)persona.Element("apellido") ?? string.Empty).Trim();
        var tipoPersona = ((string?)persona.Element("tipoPersona") ?? string.Empty).Trim();
        var domicilio = persona
            .Descendants()
            .FirstOrDefault(d =>
                string.Equals(d.Name.LocalName, "domicilio", StringComparison.OrdinalIgnoreCase) &&
                string.Equals((string?)d.Elements().FirstOrDefault(e => string.Equals(e.Name.LocalName, "tipoDomicilio", StringComparison.OrdinalIgnoreCase)), "FISCAL", StringComparison.OrdinalIgnoreCase))
            ?? persona.Descendants().FirstOrDefault(d => string.Equals(d.Name.LocalName, "domicilio", StringComparison.OrdinalIgnoreCase));
        var activityId = (int?)persona.Element("idActividadPrincipal") ?? 0;
        var activityDescription = ((string?)persona.Element("descripcionActividadPrincipal") ?? string.Empty).Trim();
        var ivaCondition = ParseA13IvaCondition(persona);
        var businessName = string.IsNullOrWhiteSpace(razonSocial)
            ? BuildDisplayName(apellido, nombre)
            : razonSocial;

        return new ArcaTaxpayerData
        {
            Cuit = idPersona,
            PersonType = tipoPersona,
            KeyStatus = estadoClave,
            BusinessName = businessName,
            FirstName = nombre,
            LastName = apellido,
            FiscalAddress = ParseA13FiscalAddress(domicilio),
            IvaCondition = ivaCondition.condition,
            IvaConditionId = ivaCondition.id,
            EconomicActivities = activityId > 0
                ? [new EconomicActivity { ActivityId = activityId, Description = activityDescription }]
                : []
        };
    }

    private static FiscalAddress? ParseFiscalAddress(XElement? datosGenerales)
    {
        var domicilio = datosGenerales?.Element("domicilio");
        if (domicilio is null) return null;

        return new FiscalAddress
        {
            Street = ((string?)domicilio.Element("direccion") ?? string.Empty).Trim(),
            StreetNumber = (int?)domicilio.Element("numeroCalle"),
            Floor = ((string?)domicilio.Element("piso") ?? string.Empty).Trim(),
            Apartment = ((string?)domicilio.Element("departamento") ?? string.Empty).Trim(),
            ZipCode = ((string?)domicilio.Element("codPostal") ?? string.Empty).Trim(),
            City = ((string?)domicilio.Element("localidad") ?? string.Empty).Trim(),
            Province = ((string?)domicilio.Element("provincia") ?? string.Empty).Trim(),
            Country = ((string?)domicilio.Element("pais") ?? string.Empty).Trim()
        };
    }

    private static FiscalAddress? ParseA13FiscalAddress(XElement? domicilio)
    {
        if (domicilio is null) return null;

        return new FiscalAddress
        {
            Street = GetFirstTrimmedValue(domicilio, "calle", "direccion"),
            StreetNumber = ParseNullableInt(GetFirstTrimmedValue(domicilio, "numero", "numeroPuerta", "numeroCalle")),
            Floor = GetFirstTrimmedValue(domicilio, "piso"),
            Apartment = GetFirstTrimmedValue(domicilio, "oficinaDptoLocal", "departamento"),
            ZipCode = GetFirstTrimmedValue(domicilio, "codigoPostal", "codPostal"),
            City = GetFirstTrimmedValue(domicilio, "localidad"),
            Province = GetFirstTrimmedValue(domicilio, "descripcionProvincia", "provincia"),
            Country = "Argentina"
        };
    }

    private static (string condition, int? id) ParseA13IvaCondition(XElement persona)
    {
        var ivaContainer = persona
            .Descendants()
            .FirstOrDefault(element =>
                string.Equals(element.Name.LocalName, "impuestoIVA", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(element.Name.LocalName, "condicionIVA", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(element.Name.LocalName, "iva", StringComparison.OrdinalIgnoreCase));

        if (ivaContainer is null)
        {
            return (string.Empty, null);
        }

        var description = GetFirstTrimmedValue(
            ivaContainer,
            "descripcionIVA",
            "descripcionCondicionIVA",
            "condicionIVA",
            "descripcion");

        var id = ParseNullableInt(GetFirstTrimmedValue(
            ivaContainer,
            "idImpuesto",
            "idCondicionIVA",
            "id"));

        return (description, id);
    }

    private static (string condition, int? id) ParseIvaCondition(XElement? datosRegimenGeneral)
    {
        var iva = datosRegimenGeneral?.Element("impuestoIVA");
        if (iva is null) return (string.Empty, null);

        return (
            ((string?)iva.Element("descripcionIVA") ?? string.Empty).Trim(),
            (int?)iva.Element("idImpuesto"));
    }

    private static List<EconomicActivity> ParseEconomicActivities(XElement? datosRegimenGeneral)
    {
        var actividades = datosRegimenGeneral?.Element("actividades");
        if (actividades is null) return [];

        return actividades.Elements("actividad")
            .Select(a =>
            {
                var startDateStr = (string?)a.Element("fechaAlta");
                var endDateStr = (string?)a.Element("fechaBaja");

                return new EconomicActivity
                {
                    ActivityId = (int?)a.Element("idActividad") ?? 0,
                    Description = ((string?)a.Element("descripcionActividad") ?? string.Empty).Trim(),
                    StartDate = ParseNullableDate(startDateStr),
                    EndDate = ParseNullableDate(endDateStr)
                };
            })
            .Where(a => a.ActivityId > 0)
            .ToList();
    }

    private static string? ParseMonotributoCategory(XElement? datosRegimenGeneral)
    {
        var cat = datosRegimenGeneral?.Element("categoriaMonotributo");
        if (cat is null) return null;

        var desc = (string?)cat.Element("descripcionCategoria");
        return string.IsNullOrWhiteSpace(desc) ? null : desc.Trim();
    }

    private static int? ParseEmployeeCount(XElement? datosRegimenGeneral)
    {
        var empleador = datosRegimenGeneral?.Element("empleador");
        if (empleador is null) return null;

        var cantidad = (string?)empleador.Element("cantidadEmpleados");
        if (string.IsNullOrWhiteSpace(cantidad)) return null;

        return int.TryParse(cantidad, out var count) ? count : null;
    }

    private static DateTime? ParseNullableDate(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return date;

        if (DateTime.TryParseExact(dateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            return date;

        return null;
    }

    private static string BuildDisplayName(string lastName, string firstName)
    {
        if (!string.IsNullOrWhiteSpace(lastName) && !string.IsNullOrWhiteSpace(firstName))
        {
            return $"{lastName}, {firstName}".Trim();
        }

        return string.IsNullOrWhiteSpace(lastName)
            ? firstName.Trim()
            : lastName.Trim();
    }

    private static string GetFirstTrimmedValue(XElement parent, params string[] localNames)
    {
        foreach (var localName in localNames)
        {
            var value = parent.Elements().FirstOrDefault(element =>
                string.Equals(element.Name.LocalName, localName, StringComparison.OrdinalIgnoreCase))?.Value;

            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return string.Empty;
    }

    private static int? ParseNullableInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }
}
