import {test,expect} from "@playwright/test";
for(const width of [1440,390]){
  test(`C2 original local event flows through ephemeral native calendar projection (${width}px)`,async({page})=>{
    // Original mobile planner intentionally hides its desktop add-event button.
    // Create with the original desktop control, then verify the same persisted
    // record and privacy behavior at the requested real mobile viewport.
    await page.setViewportSize({width:1440,height:860});
    await page.addInitScript(()=>{
      (window as any).__calendarSnapshots=[];
      window.addEventListener("hub:calendar-local",(event)=>{
        const payload=(event as CustomEvent).detail;
        (window as any).__calendarSnapshots.push(payload);
      });
    });
    const calls:string[]=[];
    page.on("request",r=>{if(r.url().includes("/api/hub/calendar/v1/events"))calls.push(r.url());});
    await page.goto("/");
    await expect(page.locator("[data-workspace-status]")).toHaveText("Workspace saved locally");
    await page.locator("[data-action=new-event]").first().click();
    await page.getByLabel("Event",{exact:true}).fill("Source-owned planning event");
    await page.locator("[data-workspace-dialog] button[data-dialog-submit]").click();
    await expect(page.locator("[data-workspace-dialog]")).not.toBeVisible();
    await page.setViewportSize({width,height:860});
    await expect.poll(()=>page.evaluate(()=>{
      const items=(window as any).__calendarSnapshots as Array<{private:boolean;events:Array<{title:string;id:string}>}>;
      return items.some(x=>x.private===false&&x.events.some(e=>e.title==="Source-owned planning event"));
    })).toBe(true);
    await page.goto("/home/calendar/?mode=week");
    await expect(page.locator("[data-workspace-status]")).toHaveText("Workspace saved locally");
    await expect(page.locator("[data-hub-calendar-c1]")).toHaveCount(1);
    await expect(page.locator("[data-workspace]")).toHaveAttribute("data-view","calendar");
    await expect(page.locator(".ws-main")).toContainText("Source-owned planning event");
    expect(calls).toEqual([]);
    await page.locator(".ws-topbar [data-action=account]").click();
    await expect(page.locator("[data-account-dialog]")).toBeVisible();
    await page.locator("[data-account-dialog] [data-connection-privacy]").click();
    await expect(page.locator("[data-workspace]")).toHaveAttribute("data-calendar-private","true");
    await expect.poll(()=>page.evaluate(()=>{
      const items=(window as any).__calendarSnapshots as Array<{private:boolean;events:unknown[]}>;
      return items.some(x=>x.private===true&&x.events.length===0);
    })).toBe(true);
  });
}
