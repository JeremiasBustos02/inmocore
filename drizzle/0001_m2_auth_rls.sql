CREATE POLICY "users can read own memberships" ON "memberships" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("memberships"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "members can read organizations" ON "organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from memberships
        where memberships.organization_id = "organizations"."id"
          and memberships.user_id = (select auth.uid())
      ));