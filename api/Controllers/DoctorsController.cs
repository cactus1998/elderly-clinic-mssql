using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/doctors")]
public class DoctorsController : ControllerBase
{
    private const string NotFoundDetail = "找不到這位醫師。";

    private readonly DoctorRepository _repo;

    public DoctorsController(DoctorRepository repo) => _repo = repo;

    /// <summary>醫師清單，依科別代碼、姓名排序分頁。可依科別篩選，預設只列在職醫師。</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<DoctorDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<DoctorDto>>> List([FromQuery] DoctorQuery query) =>
        Ok(await _repo.ListAsync(query));

    /// <summary>新增醫師。科別必須是啟用中。</summary>
    /// <response code="201">新增成功</response>
    /// <response code="400">欄位驗證失敗</response>
    /// <response code="409">科別不存在或已停用</response>
    [HttpPost]
    [ProducesResponseType(typeof(DoctorDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DoctorDto>> Create(DoctorInput input)
    {
        var result = await _repo.CreateAsync(input);
        return result.Outcome == WriteOutcome.Success
            ? Created($"/api/doctors/{result.Value!.DoctorId}", result.Value)
            : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>修改醫師。需帶回讀取時的 rowVersion。</summary>
    /// <response code="200">修改成功</response>
    /// <response code="400">欄位驗證失敗或缺少 rowVersion</response>
    /// <response code="404">醫師不存在</response>
    /// <response code="409">新科別已停用，或資料已被其他人修改</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DoctorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DoctorDto>> Update(int id, DoctorInput input)
    {
        if (this.MissingRowVersion(input.RowVersion)) return ValidationProblem(ModelState);
        var result = await _repo.UpdateAsync(id, input);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>停用或啟用醫師。今天以後仍有已掛號門診時不能停用；所屬科別停用時不能啟用。</summary>
    /// <response code="200">成功</response>
    /// <response code="404">醫師不存在</response>
    /// <response code="409">業務規則不允許</response>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(DoctorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DoctorDto>> SetStatus(int id, StatusInput input)
    {
        var result = await _repo.SetActiveAsync(id, input.IsActive!.Value);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }
}
