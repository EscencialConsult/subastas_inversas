using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using SICST.Domain.Entities;

namespace SICST.Application.Common.Security;

public static class AwardIntegrity
{
    public static string CalculateDocumentHash(string documentPath)
    {
        if (string.IsNullOrWhiteSpace(documentPath) || !File.Exists(documentPath))
        {
            throw new InvalidOperationException("No se pudo calcular el hash del acta de adjudicacion.");
        }

        using var stream = File.OpenRead(documentPath);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    public static string CalculateImmutableHash(
        PurchaseProcess process,
        Award award,
        Supplier supplier,
        DocumentTemplate template)
    {
        var itemMaterial = award.Items
            .OrderBy(item => item.PurchaseItemId)
            .Select(item => string.Join(":",
                item.PurchaseItemId,
                item.Quantity.ToString("G", CultureInfo.InvariantCulture),
                item.UnitPrice.ToString("G", CultureInfo.InvariantCulture),
                item.TotalAmount.ToString("G", CultureInfo.InvariantCulture)));

        var material = string.Join("|",
            process.CompanyId,
            process.Id,
            process.Code,
            award.Id,
            supplier.Id,
            supplier.Cuit,
            award.Amount.ToString("G", CultureInfo.InvariantCulture),
            award.AdjudicatedById,
            award.AdjudicatedAtUtc.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
            award.DocumentTemplateId,
            template.Version,
            award.DocumentHash,
            string.Join(";", itemMaterial));

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material))).ToLowerInvariant();
    }
}
