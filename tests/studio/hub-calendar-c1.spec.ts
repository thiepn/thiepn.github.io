import { test, expect } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`C1 Google Calendar source is separate and opt-in (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const remote: string[] = [];
    page.on("request", request => {
      if (request.url().includes("/api/hub/calendar/v1/events")) remote.push(request.url());
    });
    await page.goto("/home/calendar/");
    await expect(page.locator("[data-hub-calendar-c1] h2")).toHaveText("Google Calendar");
    await expect(page.locator("[data-calendar-ics]")).toHaveCount(1);
    await expect(page.locator("[data-workspace]")).toHaveAttribute("data-view", "calendar");
    await expect(page.locator("[data-hub-calendar-load]")).toHaveCount(0);
    expect(remote).toEqual([]);
  });
}
test("C1 Today source has no eager authenticated calendar request", async ({ page }) => {
  const remote: string[] = [];
  page.on("request", request => {
    if (request.url().includes("/api/hub/calendar/v1/events")) remote.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("[data-hub-calendar-c1]")).toHaveCount(1);
  expect(remote).toEqual([]);
});

test("calendar selected day remains circular at desktop and narrow widths",async({page})=>{
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto("/home/calendar/");
    await expect(page.locator("[data-workspace-status]")).toHaveText("Workspace saved locally");
    const chosen=page.locator(".ws-month button.selected");
    await expect(chosen).toHaveCount(1);
    const dimensions=await chosen.boundingBox();
    expect(dimensions).not.toBeNull();
    expect(Math.abs(dimensions!.width-dimensions!.height)).toBeLessThan(1.5);
  }
});
test("StudyOS native week is primary and the JSON import is optional",async({page})=>{
  await page.goto("/home/calendar/");
  const panel=page.locator("[data-hub-study-plan]");
  await expect(panel.getByRole("link",{name:"Open weekly plan"})).toHaveAttribute("href","https://study.thiepn.dev/week");
  await expect(panel.locator("[data-hub-study-import]")).not.toHaveAttribute("open","");
});
