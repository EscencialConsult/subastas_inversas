namespace SICST.Application.Common.Models;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }

    public PagedResult() { }

    public PagedResult(List<T> items, int totalCount, int pageNumber, int pageSize)
    {
        Items = items;
        TotalCount = totalCount;
        PageNumber = Paging.NormalizePageNumber(pageNumber);
        PageSize = Paging.NormalizePageSize(pageSize);
        TotalPages = (int)Math.Ceiling(totalCount / (double)PageSize);
    }
}
