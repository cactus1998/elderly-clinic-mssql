using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

/// <summary>
/// 新增或修改一筆生命徵象。範圍與資料表的 CHECK 約束一致：
/// 這裡先回 400 給前端看得懂的訊息，資料庫的 CHECK 是最後一道防線。
/// </summary>
public class VitalSignInput : IValidatableObject
{
    [Required]
    public DateTime? MeasuredAt { get; set; }

    [Range(50, 260)]
    public short? SystolicBP { get; set; }

    [Range(30, 160)]
    public short? DiastolicBP { get; set; }

    [Range(20, 250)]
    public short? HeartRate { get; set; }

    [Range(20, 800)]
    public short? BloodSugar { get; set; }

    [Range(typeof(decimal), "10", "300")]
    public decimal? BodyWeight { get; set; }

    [MaxLength(200)]
    public string? Note { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (SystolicBP is null && DiastolicBP is null && HeartRate is null
            && BloodSugar is null && BodyWeight is null)
        {
            yield return new ValidationResult(
                "At least one measurement is required.",
                [nameof(SystolicBP), nameof(HeartRate), nameof(BloodSugar), nameof(BodyWeight)]);
        }

        if ((SystolicBP is null) != (DiastolicBP is null))
        {
            yield return new ValidationResult(
                "SystolicBP and DiastolicBP must be provided together.",
                [nameof(SystolicBP), nameof(DiastolicBP)]);
        }

        if (MeasuredAt > DateTime.Now.AddMinutes(5))
        {
            yield return new ValidationResult("MeasuredAt cannot be in the future.", [nameof(MeasuredAt)]);
        }
    }
}
