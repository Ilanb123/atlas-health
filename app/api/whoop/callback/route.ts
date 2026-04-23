export async function GET() {
  return new Response("Whoop callback received", { status: 200 });
}
