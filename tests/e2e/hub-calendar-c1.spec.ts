import { test, expect } from "@playwright/test";
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  test(`C1 Google Calendar is opt-in and does not replace original Hub calendar at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    const requests:string[]=[];
    page.on("request",req=>{if(req.url().includes("/api/hub/calendar/v1/events"))requests.push(req.url());});
    await page.goto("/home/calendar/");
    await expect(page.locator("[data-hub-calendar-c1]")).toHaveCount(1);
    await expect(page.locator("[data-hub-calendar-c1] h2")).toHaveText("Google Calendar");
    await expect(page.locator("[data-calendar-ics]")).toHaveCount(1);
    await expect(page.locator("[data-workspace]")).toHaveAttribute("data-view","calendar");
    await expect(page.locator("[data-hub-calendar-load]")).toHaveCount(0);
    expect(requests).toEqual([]);
  });
}
test("C1 private calendar also has a distinct Today surface, no eager reads",async({page})=>{
  const requests:string[]=[];
  page.on("request",req=>{if(req.url().includes("/api/hub/calendar/v1/events"))requests.push(req.url());});
  await page.goto("/");
  await expect(page.locator("[data-hub-calendar-c1]")).toHaveCount(1);
  expect(requests).toEqual([]);
});
