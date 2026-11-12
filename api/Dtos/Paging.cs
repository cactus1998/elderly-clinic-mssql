using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

/// <summary>分頁查詢參數。page 從 1 開始，pageSize 1 到 100。</summary>
public class PageQuery
{
    [Range(1, int.MaxValue, ErrorMessage = "page 必須是 1 以上的整數。")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "pageSize 必須介於 1 到 100。")]
    public int PageSize { get; set; } = 20;

    public int Skip => (Page - 1) * PageSize;
}

/// <summary>分頁回應。page 超過最後一頁時 items 為空，totalCount 照實回傳。</summary>
public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

/// <summary>停用或啟用。</summary>
public class StatusInput
{
    [Required(ErrorMessage = "isActive 為必填。")]
    public bool? IsActive { get; set; }
}
