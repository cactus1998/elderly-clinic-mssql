using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/vitals")]
public class VitalsController : ControllerBase
{
    private readonly VitalSignRepository _repo;

    public VitalsController(VitalSignRepository repo) => _repo = repo;

    /// <summary>修改一筆生命徵象（整筆取代）。</summary>
    /// <response code="200">修改成功，回傳修改後的資料</response>
    /// <response code="400">欄位驗證失敗</response>
    /// <response code="404">紀錄不存在</response>
    [HttpPut("{vitalId:int}")]
    [ProducesResponseType(typeof(VitalSignDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VitalSignDto>> Update(int vitalId, VitalSignInput input)
    {
        var updated = await _repo.UpdateAsync(vitalId, input);
        return updated is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: $"Vital sign {vitalId} not found.")
            : Ok(updated);
    }

    /// <summary>刪除一筆生命徵象。</summary>
    /// <response code="204">刪除成功</response>
    /// <response code="404">紀錄不存在</response>
    [HttpDelete("{vitalId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int vitalId)
    {
        return await _repo.DeleteAsync(vitalId)
            ? NoContent()
            : Problem(statusCode: StatusCodes.Status404NotFound, title: $"Vital sign {vitalId} not found.");
    }
}
