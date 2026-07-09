namespace SICST.Domain.Entities;

public class ArcaVerificationAudit
{
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public ArcaVerificationStatus Result { get; set; }

    public string Notes { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;

    public int? BusinessNameMatchScore { get; set; }

    public string? CuitConsulted { get; set; }

    public string? BusinessNameDeclared { get; set; }

    public string? BusinessNameFoundInArca { get; set; }

    public string? RawResponseSummary { get; set; }

    public Guid? ReviewedByUserId { get; set; }

    public User? ReviewedBy { get; set; }

    public bool Automatic { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
