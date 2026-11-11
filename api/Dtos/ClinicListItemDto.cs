namespace api.Dtos;

/// <summary>dbo.usp_GetClinicList 回傳的一列門診資料。</summary>
public class ClinicListItemDto
{
    public int AppointmentId { get; set; }
    public int PatientId { get; set; }
    public string DeptName { get; set; } = "";
    public string DoctorName { get; set; } = "";
    /// <summary>M = 早診, A = 午診, E = 晚診</summary>
    public string Session { get; set; } = "";
    public int SeqNo { get; set; }
    public string ChartNo { get; set; } = "";
    public string PatientName { get; set; } = "";
    /// <summary>BOOKED / CHECKED_IN / DONE</summary>
    public string Status { get; set; } = "";
}
