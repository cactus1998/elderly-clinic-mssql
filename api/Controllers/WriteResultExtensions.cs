using api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

public static class WriteResultExtensions
{
    /// <summary>
    /// 把失敗的 WriteResult 轉成 ProblemDetails：title 給開發者看（英文），detail 給使用者看（中文）。
    /// </summary>
    public static ObjectResult ToProblem<T>(this ControllerBase controller, WriteResult<T> result, string notFoundDetail) =>
        result.Outcome switch
        {
            WriteOutcome.NotFound => controller.Problem(
                statusCode: StatusCodes.Status404NotFound, title: "Resource not found.", detail: notFoundDetail),
            WriteOutcome.Conflict => controller.Problem(
                statusCode: StatusCodes.Status409Conflict, title: "Conflict.", detail: result.Reason),
            _ => throw new InvalidOperationException("ToProblem is only for failed results."),
        };

    /// <summary>修改時必須帶 rowVersion（樂觀併發控制）。缺少時回 400。</summary>
    public static bool MissingRowVersion(this ControllerBase controller, byte[]? rowVersion)
    {
        if (rowVersion is { Length: > 0 }) return false;
        controller.ModelState.AddModelError("rowVersion", "rowVersion 為必填，請重新載入資料後再修改。");
        return true;
    }
}
