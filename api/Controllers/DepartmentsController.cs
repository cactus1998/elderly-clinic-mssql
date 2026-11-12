using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/departments")]
public class DepartmentsController : ControllerBase
{
    private const string NotFoundDetail = "找不到這個科別。";

    private readonly DepartmentRepository _repo;

    public DepartmentsController(DepartmentRepository repo) => _repo = repo;

    /// <summary>科別清單，依科別代碼排序分頁。預設只列啟用中的科別。</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<DepartmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<DepartmentDto>>> List([FromQuery] DepartmentQuery query) =>
        Ok(await _repo.ListAsync(query));

    /// <summary>新增科別。</summary>
    /// <response code="201">新增成功</response>
    /// <response code="400">欄位驗證失敗</response>
    /// <response code="409">科別代碼已存在</response>
    [HttpPost]
    [ProducesResponseType(typeof(DepartmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DepartmentDto>> Create(DepartmentInput input)
    {
        var result = await _repo.CreateAsync(input);
        return result.Outcome == WriteOutcome.Success
            ? Created($"/api/departments/{result.Value!.DeptId}", result.Value)
            : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>修改科別。需帶回讀取時的 rowVersion。</summary>
    /// <response code="200">修改成功</response>
    /// <response code="400">欄位驗證失敗或缺少 rowVersion</response>
    /// <response code="404">科別不存在</response>
    /// <response code="409">科別代碼已存在，或資料已被其他人修改</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DepartmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DepartmentDto>> Update(int id, DepartmentInput input)
    {
        if (this.MissingRowVersion(input.RowVersion)) return ValidationProblem(ModelState);
        var result = await _repo.UpdateAsync(id, input);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>停用或啟用科別。仍有在職醫師時不能停用。</summary>
    /// <response code="200">成功</response>
    /// <response code="404">科別不存在</response>
    /// <response code="409">仍有在職醫師</response>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(DepartmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DepartmentDto>> SetStatus(int id, StatusInput input)
    {
        var result = await _repo.SetActiveAsync(id, input.IsActive!.Value);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }
}
