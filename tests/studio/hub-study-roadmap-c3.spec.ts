import {test,expect} from "@playwright/test";
for(const width of [1440,390]){
 test(`C3 roadmap stays consent-only and private on ${width}px`,async({page})=>{
   await page.setViewportSize({width,height:844});
   const provider:string[]=[];
   page.on("request",request=>{if(request.url().includes("/api/hub/calendar/v1/events"))provider.push(request.url());});
   await page.goto("/home/calendar/?mode=week");
   await expect(page.locator("[data-workspace-status]")).toHaveText("Workspace saved locally");
   const panel=page.locator("[data-hub-study-plan]");
   await expect(panel).toHaveCount(1);
   await expect(panel.locator("h3")).toHaveText("StudyOS weekly plan");
   await expect(panel.locator("[data-hub-study-file]")).toBeDisabled();
   await expect(panel.locator("[data-hub-study-status]")).toContainText("Sign in");
   await expect(panel.locator("[data-hub-study-clear]")).toBeHidden();
   expect(provider).toEqual([]);
 });
}
test("C3 signed-out native Today never displays private course targets",async({page})=>{
 await page.goto("/");
 await expect(page.locator("[data-hub-study-plan]")).toHaveCount(1);
 await expect(page.locator("[data-hub-study-content]")).toBeEmpty();
});
