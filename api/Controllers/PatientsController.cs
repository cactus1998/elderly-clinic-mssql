using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/patients")]
public class PatientsController : ControllerBase
{
    private const string NotFoundDetail = "找不到這位病人。";

    private readonly PatientRepository _repo;
    private readonly VitalSignRepository _vitals;

    public PatientsController(PatientRepository repo, VitalSignRepository vitals)
    {
        _repo = repo;
        _vitals = vitals;
    }

    /// <summary>病人清單，依病歷號排序分頁。keyword 比對病歷號開頭或姓名包含；電話已遮罩。</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PatientListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<PatientListItemDto>>> List([FromQuery] PatientQuery query) =>
        Ok(await _repo.ListAsync(query));

    /// <summary>病人基本資料（含完整電話）。</summary>
    /// <response code="200">成功</response>
    /// <response code="404">病人不存在</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PatientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientDto>> Get(int id)
    {
        var patient = await _repo.GetAsync(id);
        return patient is null ? PatientNotFound() : Ok(patient);
    }

    /// <summary>新增病人。病歷號由系統產生。</summary>
    /// <response code="201">新增成功</response>
    /// <response code="400">欄位驗證失敗</response>
    [HttpPost]
    [ProducesResponseType(typeof(PatientDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PatientDto>> Create(PatientInput input)
    {
        var created = await _repo.CreateAsync(input);
        return Created($"/api/patients/{created.PatientId}", created);
    }

    /// <summary>修改病人（病歷號不可改）。需帶回讀取時的 rowVersion。</summary>
    /// <response code="200">修改成功</response>
    /// <response code="400">欄位驗證失敗或缺少 rowVersion</response>
    /// <response code="404">病人不存在</response>
    /// <response code="409">資料已被其他人修改</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(PatientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientDto>> Update(int id, PatientInput input)
    {
        if (this.MissingRowVersion(input.RowVersion)) return ValidationProblem(ModelState);
        var result = await _repo.UpdateAsync(id, input);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>停用或啟用病人。今天以後仍有已掛號門診時不能停用。</summary>
    /// <response code="200">成功</response>
    /// <response code="404">病人不存在</response>
    /// <response code="409">仍有已掛號門診</response>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(PatientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientDto>> SetStatus(int id, StatusInput input)
    {
        var result = await _repo.SetActiveAsync(id, input.IsActive!.Value);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>病人最近 N 天的生命徵象，依量測時間由新到舊分頁。</summary>
    /// <param name="id">PatientId</param>
    /// <param name="query">days 1 到 365（預設 14）；page、pageSize</param>
    [HttpGet("{id:int}/vitals")]
    [ProducesResponseType(typeof(PagedResult<VitalSignDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<VitalSignDto>>> GetVitals(int id, [FromQuery] VitalQuery query)
    {
        if (!await _repo.ExistsAsync(id)) return PatientNotFound();
        return Ok(await _repo.GetVitalsAsync(id, query));
    }

    /// <summary>新增一筆生命徵象。</summary>
    /// <param name="id">PatientId</param>
    /// <param name="input">量測資料</param>
    /// <response code="201">新增成功，回傳新增的資料</response>
    /// <response code="400">欄位驗證失敗</response>
    /// <response code="404">病人不存在</response>
    /// <response code="409">病人已停用</response>
    [HttpPost("{id:int}/vitals")]
    [ProducesResponseType(typeof(VitalSignDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VitalSignDto>> CreateVital(int id, VitalSignInput input)
    {
        var result = await _vitals.CreateAsync(id, input);
        return result.Outcome == WriteOutcome.Success
            ? Created($"/api/vitals/{result.Value!.VitalId}", result.Value)
            : this.ToProblem(result, NotFoundDetail);
    }

    private ObjectResult PatientNotFound() =>
        Problem(statusCode: StatusCodes.Status404NotFound, title: "Resource not found.", detail: NotFoundDetail);
}
