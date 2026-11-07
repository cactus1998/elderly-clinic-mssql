namespace api.Dtos;

/// <summary>一筆生命徵象量測。每次量測不一定每項都有，所以數值欄位可為 null。</summary>
public class VitalSignDto
{
    public int VitalId { get; set; }
    public DateTime MeasuredAt { get; set; }
    public short? SystolicBP { get; set; }
    public short? DiastolicBP { get; set; }
    public short? HeartRate { get; set; }
    public short? BloodSugar { get; set; }
    public decimal? BodyWeight { get; set; }
    public string? Note { get; set; }
}
