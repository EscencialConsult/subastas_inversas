namespace SICST.Application.Common.Models;

public record ArcaTaxpayerData
{
    public long Cuit { get; init; }
    public string PersonType { get; init; } = string.Empty;
    public string KeyStatus { get; init; } = string.Empty;
    public string BusinessName { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;

    public FiscalAddress? FiscalAddress { get; init; }

    public string IvaCondition { get; init; } = string.Empty;
    public int? IvaConditionId { get; init; }

    public List<EconomicActivity> EconomicActivities { get; init; } = [];

    public string? MonotributoCategory { get; init; }

    public int? EmployeeCount { get; init; }

    public string? MensajeError { get; init; }
    public bool Found => string.IsNullOrEmpty(MensajeError) && Cuit > 0;
}

public record FiscalAddress
{
    public string Street { get; init; } = string.Empty;
    public int? StreetNumber { get; init; }
    public string Floor { get; init; } = string.Empty;
    public string Apartment { get; init; } = string.Empty;
    public string ZipCode { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;
}

public record EconomicActivity
{
    public int ActivityId { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
}
