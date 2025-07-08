ALTER TABLE "users" RENAME TO "agents";--> statement-breakpoint
ALTER TABLE "alerts" RENAME COLUMN "user_id" TO "agent_id";--> statement-breakpoint
ALTER TABLE "wallets" RENAME COLUMN "user_id" TO "agent_id";--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_email_unique" UNIQUE("email");