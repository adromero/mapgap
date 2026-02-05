import { test, expect } from '@playwright/test';

test.describe('Core user flow smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with header and industry picker', async ({ page }) => {
    // Header is visible
    await expect(page.locator('header')).toBeVisible();

    // Industry picker is present (wait for industries to load)
    const industryPicker = page.getByText('Select industry...');
    await expect(industryPicker).toBeVisible({ timeout: 10000 });
  });

  test('select industry → view map → top counties appear', async ({ page }) => {
    // 1. Wait for industry picker to be enabled, then open it
    const industryPicker = page.getByText('Select industry...');
    await expect(industryPicker).toBeVisible({ timeout: 10000 });
    await industryPicker.click();

    // 2. Select "Coffee Shops" from the dropdown
    await page.getByRole('option', { name: /Coffee Shops/ }).click();

    // 3. Verify industry is selected
    await expect(page.getByText('Coffee Shops').first()).toBeVisible();

    // 4. Wait for map to finish loading (loading overlay disappears)
    await expect(page.getByText('Loading map...')).toBeHidden({ timeout: 30000 });

    // 5. Map canvas should be present
    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible();

    // 6. Top 10 counties list should appear in sidebar
    await expect(page.getByText('Top 10 Counties')).toBeVisible({ timeout: 15000 });
  });

  test('select industry → click county on map → detail panel appears', async ({ page }) => {
    // 1. Select an industry first
    const industryPicker = page.getByText('Select industry...');
    await expect(industryPicker).toBeVisible({ timeout: 10000 });
    await industryPicker.click();
    await page.getByRole('option', { name: /Coffee Shops/ }).click();

    // 2. Wait for map data to load
    await expect(page.getByText('Loading map...')).toBeHidden({ timeout: 30000 });

    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible();

    // 3. Wait for choropleth data to load (top counties list appears)
    await expect(page.getByText('Top 10 Counties')).toBeVisible({ timeout: 15000 });

    // 4. Click on the center of the map canvas (roughly center of US)
    //    This should hit a county and open the detail panel
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

    // 5. Detail panel should appear (use first() since both desktop and mobile render)
    const detailPanel = page.getByTestId('detail-panel').first();
    await expect(detailPanel).toBeVisible({ timeout: 10000 });

    // 6. KPI cards should be visible
    const kpiCards = page.getByTestId('kpi-cards').first();
    await expect(kpiCards).toBeVisible({ timeout: 15000 });

    // 7. Verify KPI card labels are present
    await expect(detailPanel.getByText('Opportunity Score')).toBeVisible();
    await expect(detailPanel.getByText('Establishments')).toBeVisible();

    // 8. Close button should be available
    await expect(page.getByLabel('Close detail panel').first()).toBeVisible();
  });

  test('detail panel can be closed', async ({ page }) => {
    // Setup: select industry and click a county
    const industryPicker = page.getByText('Select industry...');
    await expect(industryPicker).toBeVisible({ timeout: 10000 });
    await industryPicker.click();
    await page.getByRole('option', { name: /Coffee Shops/ }).click();

    await expect(page.getByText('Loading map...')).toBeHidden({ timeout: 30000 });
    await expect(page.getByText('Top 10 Counties')).toBeVisible({ timeout: 15000 });

    const canvas = page.locator('canvas.maplibregl-canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

    // Target the desktop detail panel (inside the hidden md:block container)
    const desktopDetail = page.locator('.hidden.md\\:block [data-testid="detail-panel"]');
    await expect(desktopDetail).toBeVisible({ timeout: 10000 });

    // Close the detail panel using the desktop close button
    // Use force:true because the mobile drawer overlay may intercept pointer events
    await desktopDetail.getByLabel('Close detail panel').click({ force: true });
    await expect(desktopDetail).toBeHidden();
  });
});
