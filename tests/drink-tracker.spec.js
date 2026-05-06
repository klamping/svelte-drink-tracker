import { expect, test } from '@playwright/test';

test.describe('Drink tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
  });

  const toLocalDateTimeValue = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  test('adds a drink and updates totals', async ({ page }) => {
    await page.locator('#drink-size').fill('12');
    await page.locator('#alcohol-percentage').fill('5');
    await page.getByRole('button', { name: 'Add Drink' }).click();

    const todayCard = page.getByRole('heading', { name: 'Total Drinks Today' }).locator('..');
    await expect(todayCard.getByText('1.00 Standard Drinks')).toBeVisible();

    const totalCard = page.getByRole('heading', { name: 'Total Drinks' }).locator('..');
    await expect(totalCard.getByText('1.00 Standard Drinks', { exact: true }).first()).toBeVisible();
  });

  test('uses the selected retroactive date for counts', async ({ page }) => {
    const retroDate = new Date();
    retroDate.setDate(retroDate.getDate() - 1);
    retroDate.setHours(12, 0, 0, 0);

    await page.locator('#drink-size').fill('12');
    await page.locator('#alcohol-percentage').fill('5');
    await page.locator('#entry-date').fill(toLocalDateTimeValue(retroDate));
    await page.getByRole('button', { name: 'Add Drink' }).click();

    const todayCard = page.getByRole('heading', { name: 'Total Drinks Today' }).locator('..');
    await expect(todayCard.getByText('1.00 Standard Drinks')).toHaveCount(0);

    const last7DaysCard = page.getByRole('heading', { name: 'Drinks in the Past 7 Days' }).locator('..');
    await expect(last7DaysCard.getByText('1.00 Standard Drinks')).toBeVisible();
  });

  test('plots recorded drinks in chart dataset', async ({ page }) => {
    await page.locator('#drink-size').fill('12');
    await page.locator('#alcohol-percentage').fill('5');
    await page.getByRole('button', { name: 'Add Drink' }).click();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          if (!window.Chart) return null;
          const chart = window.Chart.getChart('drinksChart');
          if (!chart) return null;
          return chart.data.datasets[0].data;
        });
      })
      .toContain(1);
  });
});
