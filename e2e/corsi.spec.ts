import { test, expect, type Page } from '@playwright/test'

// 入力フェーズで意図的にミスする（block-0を2回タップ → シーケンスに同ブロック連続なし保証）
async function makeWrongInput(page: Page) {
  await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('block-0').click()
  await page.waitForTimeout(300)
  if (await page.locator('[data-phase="input"]').isVisible()) {
    await page.getByTestId('block-0').click()
  }
}

// 6ラウンド全て不正解で最後まで進む
async function finishAllRounds(page: Page) {
  for (let i = 0; i < 6; i++) {
    await makeWrongInput(page)
    // feedbackが終わって次ラウンドのshowing or resultへ遷移するのを待つ
    await page.waitForTimeout(900)
  }
}

test.describe('コルシブロック', () => {
  test('ホーム画面にコルシブロックのカードが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=コルシブロック')).toBeVisible()
  })

  test('カードをクリックするとゲームページに遷移する', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=コルシブロック').click()
    await expect(page).toHaveURL(/\/games\/corsi/)
    await expect(page.locator('h1', { hasText: 'コルシブロック' })).toBeVisible()
  })

  test('スタートボタンが表示される', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await expect(page.getByTestId('start-button')).toBeVisible()
  })

  test('スタートボタンを押すとshowingフェーズになる', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await expect(page.locator('[data-phase="showing"]')).toBeVisible({ timeout: 2000 })
    await expect(page.getByTestId('corsi-board')).toBeVisible()
  })

  test('ボードに9個のブロックが表示される', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await expect(page.locator('[data-phase="showing"]')).toBeVisible({ timeout: 2000 })
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(9)
  })

  test('シーケンス終了後にinputフェーズになる', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    // span=2: 300ms待機 + (500+200)×2 ≒ 1700ms + 余裕
    await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 8000 })
  })

  test('ブロックをタップすると入力が受け付けられる', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 8000 })

    await page.getByTestId('block-0').click()

    // input継続 or feedbackのいずれかになること（ラウンド継続型のため即終了はしない）
    await expect(
      page.locator('[data-phase="input"], [data-phase="feedback"]')
    ).toBeVisible({ timeout: 3000 })
  })

  test('結果画面にスコアと統計が表示される', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await finishAllRounds(page)
    await expect(page.getByTestId('replay-button')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=正解ラウンド')).toBeVisible()
  })

  test('もう一度ボタンでゲームが再スタートする', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await finishAllRounds(page)
    await expect(page.getByTestId('replay-button')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('replay-button').click()
    await expect(page.locator('[data-phase="showing"]')).toBeVisible({ timeout: 3000 })
  })
})
