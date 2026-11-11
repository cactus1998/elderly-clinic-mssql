using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/patients")]
public class PatientsController : ControllerBase
{
    private readonly PatientRepository _repo;
    private readonly VitalSignRepository _vitals;

    public PatientsController(PatientRepository repo, VitalSignRepository vitals)
    {
        _repo = repo;
        _vitals = vitals;
    }

    /// <summary>病人最近 N 天的生命徵象，依量測時間由新到舊。</summary>
    /// <param name="id">PatientId</param>
    /// <param name="days">往回查幾天，1 到 365，預設 14</param>
    [HttpGet("{id:int}/vitals")]
    [ProducesResponseType(typeof(IEnumerable<VitalSignDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<VitalSignDto>>> GetVitals(int id, [FromQuery] int days = 14)
    {
        if (days is < 1 or > 365)
        {
            ModelState.AddModelError(nameof(days), "days must be between 1 and 365.");
            return ValidationProblem(ModelState);
        }

        if (!await _repo.ExistsAsync(id))
            return Problem(statusCode: StatusCodes.Status404NotFound, title: $"Patient {id} not found.");

        var vitals = await _repo.GetVitalsAsync(id, days);
        return Ok(vitals);
    }

    /// <summary>新增一筆生命徵象。</summary>
    /// <param name="id">PatientId</param>
    /// <param name="input">量測資料</param>
    /// <response code="201">新增成功，回傳新增的資料</response>
    /// <response code="400">欄位驗證失敗</response>
    /// <response code="404">病人不存在</response>
    [HttpPost("{id:int}/vitals")]
    [ProducesResponseType(typeof(VitalSignDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VitalSignDto>> CreateVital(int id, VitalSignInput input)
    {
        var created = await _vitals.CreateAsync(id, input);
        return created is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: $"Patient {id} not found.")
            : Created($"/api/vitals/{created.VitalId}", created);
    }
}
