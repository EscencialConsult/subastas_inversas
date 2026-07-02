namespace SICST.Application.Common.Models;

public static class Paging
{
    public const int DefaultPageSize = 10;
    public const int MaxPageSize = 100;
    public const int MaxAuditLimit = 1000;

    public static int NormalizePageNumber(int pageNumber)
    {
        return Math.Max(1, pageNumber);
    }

    public static int NormalizePageSize(int pageSize, int maxPageSize = MaxPageSize)
    {
        return Math.Clamp(pageSize, 1, maxPageSize);
    }

    public static int NormalizeLimit(int limit, int maxLimit = MaxAuditLimit)
    {
        return Math.Clamp(limit, 1, maxLimit);
    }
}
