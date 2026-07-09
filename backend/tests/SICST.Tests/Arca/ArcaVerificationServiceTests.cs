using System.Net;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Infrastructure.Arca;

namespace SICST.Tests.Arca;

public class ArcaVerificationServiceTests
{
    [Fact]
    public async Task VerifySupplierAsync_ShouldVerifyWithWarning_WhenBusinessNameDoesNotMatch()
    {
        var services = new ServiceCollection();
        services.AddSingleton<WsaaClient>(_ => null!);
        await using var provider = services.BuildServiceProvider();

        var options = Options.Create(new ArcaOptions
        {
            Cuit = "30-12345678-1",
            Environment = "produccion",
            PadronVersion = "A13",
            PadronA13Url = "https://arca.test/personaServiceA13"
        });

        var taManager = new TicketAccesoManager(
            provider.GetRequiredService<IServiceScopeFactory>(),
            options,
            NullLogger<TicketAccesoManager>.Instance);
        SetCurrentTa(taManager, new TicketAcceso
        {
            Token = "token",
            Sign = "sign",
            ExpirationUtc = DateTime.UtcNow.AddHours(1)
        });

        var padronClient = new PadronA5Client(
            new HttpClient(new FixedResponseHandler(CreateA13PersonaResponse())),
            taManager,
            options,
            NullLogger<PadronA5Client>.Instance);
        var service = new ArcaVerificationService(
            padronClient,
            NullLogger<ArcaVerificationService>.Instance);

        var result = await service.VerifySupplierAsync(
            new ArcaVerificationRequest(
                "30-12345678-1",
                "Nombre Declarado Diferente",
                "proveedor@test.com",
                "Tucuman",
                "San Miguel de Tucuman"),
            CancellationToken.None);

        Assert.True(result.Verified, result.Notes);
        Assert.Contains("difiere de la registrada", result.Notes);
        Assert.Equal("Razon Social Registrada SA", result.TaxpayerData?.BusinessName);
        Assert.Equal("RESPONSABLE INSCRIPTO", result.TaxpayerData?.IvaCondition);
        Assert.Equal("San Martin 123", result.TaxpayerData?.FiscalAddress?.Street);
        Assert.Equal("Tucuman", result.TaxpayerData?.FiscalAddress?.Province);
    }

    [Fact]
    public async Task VerifySupplierAsync_ShouldUsePersonName_WhenA13DoesNotReturnRazonSocial()
    {
        var services = new ServiceCollection();
        services.AddSingleton<WsaaClient>(_ => null!);
        await using var provider = services.BuildServiceProvider();

        var options = Options.Create(new ArcaOptions
        {
            Cuit = "20-12345678-9",
            Environment = "produccion",
            PadronVersion = "A13",
            PadronA13Url = "https://arca.test/personaServiceA13"
        });

        var taManager = new TicketAccesoManager(
            provider.GetRequiredService<IServiceScopeFactory>(),
            options,
            NullLogger<TicketAccesoManager>.Instance);
        SetCurrentTa(taManager, new TicketAcceso
        {
            Token = "token",
            Sign = "sign",
            ExpirationUtc = DateTime.UtcNow.AddHours(1)
        });

        var padronClient = new PadronA5Client(
            new HttpClient(new FixedResponseHandler(CreateA13PersonaHumanaResponse())),
            taManager,
            options,
            NullLogger<PadronA5Client>.Instance);
        var service = new ArcaVerificationService(
            padronClient,
            NullLogger<ArcaVerificationService>.Instance);

        var result = await service.VerifySupplierAsync(
            new ArcaVerificationRequest(
                "20-12345678-9",
                "Perez, Juan",
                "proveedor@test.com",
                "Tucuman",
                "San Miguel de Tucuman"),
            CancellationToken.None);

        Assert.True(result.Verified, result.Notes);
        Assert.Equal("Perez, Juan", result.TaxpayerData?.BusinessName);
        Assert.Equal("MONOTRIBUTO", result.TaxpayerData?.IvaCondition);
        Assert.Equal("Yerba Buena", result.TaxpayerData?.FiscalAddress?.City);
    }

    private static void SetCurrentTa(TicketAccesoManager taManager, TicketAcceso ta)
    {
        var field = typeof(TicketAccesoManager).GetField(
            "_currentTa",
            BindingFlags.Instance | BindingFlags.NonPublic);

        Assert.NotNull(field);
        field.SetValue(taManager, ta);
    }

    private static string CreateA13PersonaResponse() =>
        """
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns2:getPersonaResponse xmlns:ns2="http://a13.soap.ws.server.puc.sr/">
              <personaReturn>
                <persona>
                  <idPersona>30123456781</idPersona>
                  <tipoPersona>JURIDICA</tipoPersona>
                  <estadoClave>ACTIVO</estadoClave>
                  <razonSocial>Razon Social Registrada SA</razonSocial>
                  <impuestoIVA>
                    <idImpuesto>30</idImpuesto>
                    <descripcionIVA>RESPONSABLE INSCRIPTO</descripcionIVA>
                  </impuestoIVA>
                  <idActividadPrincipal>620100</idActividadPrincipal>
                  <descripcionActividadPrincipal>Servicios informaticos</descripcionActividadPrincipal>
                  <domicilio>
                    <tipoDomicilio>FISCAL</tipoDomicilio>
                    <direccion>San Martin 123</direccion>
                    <localidad>San Miguel de Tucuman</localidad>
                    <descripcionProvincia>Tucuman</descripcionProvincia>
                    <codigoPostal>4000</codigoPostal>
                  </domicilio>
                </persona>
              </personaReturn>
            </ns2:getPersonaResponse>
          </soap:Body>
        </soap:Envelope>
        """;

    private static string CreateA13PersonaHumanaResponse() =>
        """
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns2:getPersonaResponse xmlns:ns2="http://a13.soap.ws.server.puc.sr/">
              <personaReturn>
                <persona>
                  <idPersona>20123456789</idPersona>
                  <tipoPersona>FISICA</tipoPersona>
                  <estadoClave>ACTIVO</estadoClave>
                  <nombre>Juan</nombre>
                  <apellido>Perez</apellido>
                  <condicionIVA>
                    <idCondicionIVA>6</idCondicionIVA>
                    <descripcionCondicionIVA>MONOTRIBUTO</descripcionCondicionIVA>
                  </condicionIVA>
                  <domicilio>
                    <tipoDomicilio>FISCAL</tipoDomicilio>
                    <calle>Belgrano</calle>
                    <numero>456</numero>
                    <localidad>Yerba Buena</localidad>
                    <descripcionProvincia>Tucuman</descripcionProvincia>
                    <codigoPostal>4107</codigoPostal>
                  </domicilio>
                </persona>
              </personaReturn>
            </ns2:getPersonaResponse>
          </soap:Body>
        </soap:Envelope>
        """;

    private sealed class FixedResponseHandler : HttpMessageHandler
    {
        private readonly string _response;

        public FixedResponseHandler(string response)
        {
            _response = response;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_response)
            });
        }
    }
}
