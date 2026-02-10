# ECR_Overtime (OvertimeHub) – GitHub Pages build

Deploys as a GitHub Pages **project site**:
- https://hre-ecr.github.io/ECR_Overtime/

## Supabase Auth URLs
Supabase → Authentication → URL Configuration:
- Site URL: https://hre-ecr.github.io/ECR_Overtime
- Redirect URLs:
  - https://hre-ecr.github.io/ECR_Overtime
  - https://hre-ecr.github.io/ECR_Overtime/*

## GitHub Secrets
Repo → Settings → Secrets and variables → Actions:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Manager features
Managers can:
- Create shift posts
- Confirm responders
- Cancel confirmations
- Delete shift posts

## Password onboarding
After first OTP login, users are prompted to set a permanent password.
Magic Link remains available as a fallback.
