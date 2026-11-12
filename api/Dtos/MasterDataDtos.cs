using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

// ---------- 科別 ----------

public class DepartmentDto
{
    public int DeptId { get; set; }
    public string DeptCode { get; set; } = "";
    public string DeptName { get; set; } = "";
    public bool IsActive { get; set; }
    /// <summary>樂觀併發控制用；修改時原樣送回。JSON 為 Base64 字串。</summary>
    public byte[] RowVersion { get; set; } = [];
}

public class DepartmentQuery : PageQuery
{
    public bool IncludeInactive { get; set; }
}

public class DepartmentInput
{
    [Required(ErrorMessage = "科別代碼為必填。")]
    [RegularExpression("^[A-Z0-9]{2,10}$", ErrorMessage = "科別代碼須為 2 到 10 個大寫英文或數字。")]
    public string DeptCode { get; set; } = "";

    [Required(ErrorMessage = "科別名稱為必填。")]
    [MaxLength(50, ErrorMessage = "科別名稱最多 50 字。")]
    public string DeptName { get; set; } = "";

    /// <summary>修改時必填（新增時不用）。</summary>
    public byte[]? RowVersion { get; set; }
}

// ---------- 醫師 ----------

public class DoctorDto
{
    public int DoctorId { get; set; }
    public int DeptId { get; set; }
    public string DeptCode { get; set; } = "";
    public string DeptName { get; set; } = "";
    public string DoctorName { get; set; } = "";
    public string Title { get; set; } = "";
    public bool IsActive { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

public class DoctorQuery : PageQuery
{
    [Range(1, int.MaxValue, ErrorMessage = "deptId 必須是正整數。")]
    public int? DeptId { get; set; }

    public bool IncludeInactive { get; set; }
}

public class DoctorInput
{
    [Required(ErrorMessage = "科別為必填。")]
    [Range(1, int.MaxValue, ErrorMessage = "科別為必填。")]
    public int? DeptId { get; set; }

    [Required(ErrorMessage = "醫師姓名為必填。")]
    [MaxLength(50, ErrorMessage = "醫師姓名最多 50 字。")]
    public string DoctorName { get; set; } = "";

    [Required(ErrorMessage = "職稱為必填。")]
    [MaxLength(20, ErrorMessage = "職稱最多 20 字。")]
    public string Title { get; set; } = "";

    public byte[]? RowVersion { get; set; }
}

// ---------- 病人 ----------

/// <summary>病人清單的一列。電話已遮罩，完整電話只在詳細資料提供。</summary>
public class PatientListItemDto
{
    public int PatientId { get; set; }
    public string ChartNo { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string Gender { get; set; } = "";
    public DateTime BirthDate { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
}

public class PatientDto
{
    public int PatientId { get; set; }
    public string ChartNo { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string Gender { get; set; } = "";
    public DateTime BirthDate { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyPhone { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

public class PatientQuery : PageQuery
{
    /// <summary>比對病歷號開頭或姓名包含。</summary>
    [MaxLength(50, ErrorMessage = "關鍵字最多 50 字。")]
    public string? Keyword { get; set; }

    public bool IncludeInactive { get; set; }
}

public class PatientInput : IValidatableObject
{
    private const string PhonePattern = @"^[0-9+\- ]*$";

    [Required(ErrorMessage = "姓名為必填。")]
    [MaxLength(50, ErrorMessage = "姓名最多 50 字。")]
    public string PatientName { get; set; } = "";

    [Required(ErrorMessage = "性別為必填。")]
    [RegularExpression("^[MF]$", ErrorMessage = "性別須為 M 或 F。")]
    public string Gender { get; set; } = "";

    [Required(ErrorMessage = "生日為必填。")]
    public DateTime? BirthDate { get; set; }

    [MaxLength(20, ErrorMessage = "電話最多 20 字。")]
    [RegularExpression(PhonePattern, ErrorMessage = "電話只能包含數字、-、+ 與空白。")]
    public string? Phone { get; set; }

    [MaxLength(200, ErrorMessage = "地址最多 200 字。")]
    public string? Address { get; set; }

    [MaxLength(50, ErrorMessage = "緊急聯絡人最多 50 字。")]
    public string? EmergencyContact { get; set; }

    [MaxLength(20, ErrorMessage = "緊急聯絡電話最多 20 字。")]
    [RegularExpression(PhonePattern, ErrorMessage = "緊急聯絡電話只能包含數字、-、+ 與空白。")]
    public string? EmergencyPhone { get; set; }

    public byte[]? RowVersion { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (BirthDate is { } d && (d.Date < new DateTime(1900, 1, 1) || d.Date > DateTime.Today))
            yield return new ValidationResult("生日須介於 1900-01-01 與今天。", [nameof(BirthDate)]);
    }
}
