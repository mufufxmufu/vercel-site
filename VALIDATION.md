# 検証結果（2026-10-04）

対象：GitHub `fix/booking-20261004` のVercelプレビュー。実API検証は本番を複製したNeonの検証用ブランチで実施し、本番の会員・予約データは変更していません。

## ローカル

- 予約日時・営業時間・前後15分・同意・署名Cookie・パスワード検証・匿名/別サイト送信拒否：6件通過。
- JavaScript構文チェックおよび画像デコード：通過。

## プレビューの実API

- anonymous booking: 401（期待値 401）通過。
- register: 201（期待値 201）通過。
- member session: 200（期待値 200）通過。
- wrong password: 401（期待値 401）通過。
- login second session: 200（期待値 200）通過。
- missing consent: 400（期待値 400）通過。
- concurrent same slot: [201, 409]（期待値 [201, 409]）通過。
- overlapping preparation: 409（期待値 409）通過。
- independent room: 201（期待値 201）通過。
- booking history: 2（期待値 2）通過。
- payment remains pending: True（期待値 True）通過。
- logout: 200（期待値 200）通過。
- session removed: 401（期待値 401）通過。

## データベース

- 既存のusers/bookingsの列・型・制約を確認。既存DBの重複排除制約は前後15分を含みます。
- 2つの同時トランザクションでも同じ枠に保存された予約は1件。隣接枠は拒否、別部屋は許可。

## ブラウザー

- プレビュー画面が読み込まれ、ロゴ・写真・QRを含む画像6件を正常表示。
- ページ由来のコンソールエラーなし（ブラウザー拡張のメタデータ送信エラー1件を除く）。
- ログイン後の予約操作をブラウザーで手動確認する検証は未実施。登録・ログイン・予約・履歴・ログアウトはHTTP APIで確認しました。

PayPay入金そのものの照合は自動化していません。予約はpending_paymentで保存され、運営者の入金確認が必要です。

## Four-digit PIN verification (2026-10-04)

17 isolated preview HTTP checks passed: invalid PIN rejection, leading-zero registration and login, authenticated PIN change, old PIN rejection, new PIN login, and persistent five-attempt / 15-minute limit. Existing password hashes remain unchanged until an authenticated member changes their own PIN.

## Continuous booking / cancellation / administrator verification (2026-10-05)

10 local checks passed, including continuous hourly billing, opening/closing buffers, grouping adjacent admin slots, malformed selection rejection and member-bound administrator authorization.

25 actual HTTP checks passed against the isolated Neon preview database: member 3-hour booking and billing, owner cancellation, rejection of another member cancellation, released-slot rebooking, simultaneous booking (one 201, one 409), administrator login, ordinary-member rejection, monthly applicant contact details, adjacent administrator batch merge, batch conflict rollback, and administrator cancellation. Test bookings were cancelled only in that isolated database. Production customer bookings were not modified by verification.

Browser checked public adjacent-slot selection (09:15–12:15, 3,600 yen) and dedicated administrator login entry. Private admin calendar API was verified with a synthetic administrator in preview; production admin access requires binding the real registered member ID.
