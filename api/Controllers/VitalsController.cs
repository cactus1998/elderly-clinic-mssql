using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/vitals")]
public class VitalsController : ControllerBase
{
    private const string NotFoundDetail = "找不到這筆量測紀錄。";

    private readonly VitalSignRepository _repo;

    public VitalsController(VitalSignRepository repo) => _repo = repo;

    /// <summary>修改一筆生命徵象（整筆取代）。</summary>
    /// <response code="200">修改成功，回傳修改後的資料</response>
    /// <response code="400">欄位驗證失敗</response>
    /// <response code="404">紀錄不存在</response>
    /// <response code="409">病人已停用</response>
    [HttpPut("{vitalId:int}")]
    [ProducesResponseType(typeof(VitalSignDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VitalSignDto>> Update(int vitalId, VitalSignInput input)
    {
        var result = await _repo.UpdateAsync(vitalId, input);
        return result.Outcome == WriteOutcome.Success ? Ok(result.Value) : this.ToProblem(result, NotFoundDetail);
    }

    /// <summary>刪除一筆生命徵象。</summary>
    /// <response code="204">刪除成功</response>
    /// <response code="404">紀錄不存在</response>
    /// <response code="409">病人已停用</response>
    [HttpDelete("{vitalId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int vitalId)
    {
        var result = await _repo.DeleteAsync(vitalId);
        return result.Outcome == WriteOutcome.Success ? NoContent() : this.ToProblem(result, NotFoundDetail);
    }
}
