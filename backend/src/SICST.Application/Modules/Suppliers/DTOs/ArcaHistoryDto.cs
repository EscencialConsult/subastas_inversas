using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.DTOs;

public class ArcaHistoryDto
{
    public required Guid Id { get; init; }
    public required Guid SupplierId { get; init; }
    public required ArcaVerificationStatus Result { get; init; }
    public required string Notes { get; init; }
    public required string Source { get; init; }
    public int? BusinessNameMatchScore { get; init; }
    public string? CuitConsulted { get; init; }
    public string? BusinessNameDeclared { get; init; }
    public string? BusinessNameFoundInArca { get; init; }
    public string? RawResponseSummary { get; init; }
    public Guid? ReviewedByUserId { get; init; }
    public required bool Automatic { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
}
