using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace api.Controllers;

[ApiController]
[Route("api/clinic")]
public class ClinicController : ControllerBase
{
    private readonly ClinicRepository _repo;

    public ClinicController(ClinicRepository repo) => _repo = repo;

    /// <summary>某天的門診清單（不含已取消）。deptId 不傳就查全部科別。</summary>
    /// <param name="date">看診日期，格式 yyyy-MM-dd</param>
    /// <param name="deptId">科別編號，可不傳</param>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ClinicListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<ClinicListItemDto>>> GetClinicList(
        [FromQuery, BindRequired] DateOnly date,
        [FromQuery] int? deptId)
    {
        if (deptId is <= 0)
        {
            ModelState.AddModelError(nameof(deptId), "deptId must be a positive integer.");
            return ValidationProblem(ModelState);
        }

        var list = await _repo.GetClinicListAsync(date, deptId);
        return Ok(list);
    }
}
