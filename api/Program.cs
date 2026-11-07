using api.Data;
using api.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddSingleton<SqlConnectionFactory>();
builder.Services.AddScoped<ClinicRepository>();
builder.Services.AddScoped<PatientRepository>();
builder.Services.AddScoped<AppointmentRepository>();

builder.Services.AddControllers();
// Unhandled exceptions (e.g. database unavailable) return a ProblemDetails 500
// instead of leaking a stack trace outside Development.
builder.Services.AddProblemDetails();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var xmlPath = Path.Combine(AppContext.BaseDirectory, $"{typeof(Program).Assembly.GetName().Name}.xml");
    options.IncludeXmlComments(xmlPath);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
