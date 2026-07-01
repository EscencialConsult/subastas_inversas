namespace SICST.Application.Public.DTOs;

public class OcdsReleasePackageDto
{
    public string Uri { get; set; } = string.Empty;
    public string PublisherName { get; set; } = "SICST";
    public DateTime PublishedDateUtc { get; set; }
    public List<string> Extensions { get; set; } = [];
    public List<OcdsReleaseDto> Releases { get; set; } = [];
}

public class OcdsReleaseDto
{
    public string Ocid { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<string> Tag { get; set; } = [];
    public string Language { get; set; } = "es";
    public OcdsPartyDto Buyer { get; set; } = new();
    public OcdsTenderDto Tender { get; set; } = new();
    public List<OcdsAwardDto> Awards { get; set; } = [];
    public List<OcdsContractDto> Contracts { get; set; } = [];
    public OcdsImplementationDto Implementation { get; set; } = new();
}

public class OcdsPartyDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class OcdsTenderDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal ValueAmount { get; set; }
    public string ValueCurrency { get; set; } = "ARS";
    public DateTime? DatePublished { get; set; }
    public List<OcdsItemDto> Items { get; set; } = [];
    public OcdsAuctionDto? Auction { get; set; }
}

public class OcdsItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string UnitName { get; set; } = string.Empty;
    public decimal? UnitValueAmount { get; set; }
}

public class OcdsAuctionDto
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public int BidCount { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
}

public class OcdsAwardDto
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTime Date { get; set; }
    public decimal ValueAmount { get; set; }
    public string ValueCurrency { get; set; } = "ARS";
    public OcdsPartyDto Supplier { get; set; } = new();
}

public class OcdsContractDto
{
    public string Id { get; set; } = string.Empty;
    public string AwardId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime DateSigned { get; set; }
    public decimal ValueAmount { get; set; }
    public string ValueCurrency { get; set; } = "ARS";
}

public class OcdsImplementationDto
{
    public List<OcdsTransactionDto> Transactions { get; set; } = [];
}

public class OcdsTransactionDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public decimal ValueAmount { get; set; }
    public string ValueCurrency { get; set; } = "ARS";
    public string Source { get; set; } = string.Empty;
}
