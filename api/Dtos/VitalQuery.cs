using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

public class VitalQuery : PageQuery
{
    /// <summary>往回查幾天，1 到 365，預設 14。</summary>
    [Range(1, 365, ErrorMessage = "days 必須介於 1 到 365。")]
    public int Days { get; set; } = 14;
}
