using api.Dtos;
using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    private readonly AppointmentRepository _repo;

    public AppointmentsController(AppointmentRepository repo) => _repo = repo;

    /// <summary>報到：BOOKED 改成 CHECKED_IN。</summary>
    /// <response code="200">報到成功</response>
    /// <response code="404">掛號不存在</response>
    /// <response code="409">目前狀態不是 BOOKED，不能報到</response>
    [HttpPatch("{id:int}/checkin")]
    [ProducesResponseType(typeof(CheckInResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CheckInResultDto>> CheckIn(int id)
    {
        var (outcome, currentStatus) = await _repo.CheckInAsync(id);

        return outcome switch
        {
            CheckInOutcome.Success => Ok(new CheckInResultDto { AppointmentId = id, Status = currentStatus! }),
            CheckInOutcome.NotFound => Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: $"Appointment {id} not found."),
            _ => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: $"Appointment {id} cannot be checked in.",
                detail: $"Current status is {currentStatus}; only BOOKED can be checked in."),
        };
    }
}
