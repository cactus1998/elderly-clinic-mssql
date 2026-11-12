using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

/// <summary>
/// 新增或修改一筆生命徵象。範圍與資料表的 CHECK 約束一致：
/// 這裡先回 400 給前端看得懂的訊息，資料庫的 CHECK 是最後一道防線。
/// </summary>
public class VitalSignInput : IValidatableObject
{
    [Required(ErrorMessage = "量測時間為必填。")]
    public DateTime? MeasuredAt { get; set; }

    [Range(50, 260, ErrorMessage = "收縮壓須介於 50 到 260。")]
    public short? SystolicBP { get; set; }

    [Range(30, 160, ErrorMessage = "舒張壓須介於 30 到 160。")]
    public short? DiastolicBP { get; set; }

    [Range(20, 250, ErrorMessage = "心跳須介於 20 到 250。")]
    public short? HeartRate { get; set; }

    [Range(20, 800, ErrorMessage = "血糖須介於 20 到 800。")]
    public short? BloodSugar { get; set; }

    [Range(typeof(decimal), "10", "300", ErrorMessage = "體重須介於 10 到 300。")]
    public decimal? BodyWeight { get; set; }

    [MaxLength(200, ErrorMessage = "備註最多 200 字。")]
    public string? Note { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (SystolicBP is null && DiastolicBP is null && HeartRate is null
            && BloodSugar is null && BodyWeight is null)
        {
            yield return new ValidationResult(
                "至少要填一項量測數值。",
                [nameof(SystolicBP), nameof(HeartRate), nameof(BloodSugar), nameof(BodyWeight)]);
        }

        if ((SystolicBP is null) != (DiastolicBP is null))
        {
            yield return new ValidationResult(
                "收縮壓與舒張壓要一起填寫。",
                [nameof(SystolicBP), nameof(DiastolicBP)]);
        }

        if (MeasuredAt > DateTime.Now.AddMinutes(5))
        {
            yield return new ValidationResult("量測時間不能是未來。", [nameof(MeasuredAt)]);
        }
    }
}
