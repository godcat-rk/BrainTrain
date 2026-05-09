import { test, expect } from '@playwright/test'

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
    // span=2: 500ms待機 + (800+300)×2 + 余裕 ≒ 4秒
    await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 8000 })
  })

  test('ブロックをタップすると入力が受け付けられる', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 8000 })

    await page.getByTestId('block-0').click()

    // input継続・feedback（正解）・replay-button（不正解→結果）のいずれかになること
    await expect(
      page.locator('[data-phase="input"], [data-phase="feedback"]').or(page.getByTestId('replay-button'))
    ).toBeVisible({ timeout: 3000 })
  })

  test('結果画面にスコアと統計が表示される', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 8000 })

    // 1回タップ（正解の場合はまだinput、不正解なら即result）
    await page.getByTestId('block-0').click()
    await page.waitForTimeout(300)

    // まだinputなら2回目（必ず不正解になる）
    if (await page.locator('[data-phase="input"]').isVisible().catch(() => false)) {
      await page.getByTestId('block-0').click()
    }

    await expect(page.getByTestId('replay-button')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=最大スパン')).toBeVisible()
    await expect(page.locator('text=正解ラウンド数')).toBeVisible()
  })

  test('もう一度ボタンでゲームが再スタートする', async ({ page }) => {
    await page.goto('/BrainTrain/games/corsi')
    await page.getByTestId('start-button').click()
    await expect(page.locator('[data-phase="input"]')).toBeVisible({ timeout: 8000 })

    await page.getByTestId('block-0').click()
    await page.waitForTimeout(300)

    if (await page.locator('[data-phase="input"]').isVisible().catch(() => false)) {
      await page.getByTestId('block-0').click()
    }

    await expect(page.getByTestId('replay-button')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('replay-button').click()
    await expect(page.locator('[data-phase="showing"]')).toBeVisible({ timeout: 3000 })
  })
})
