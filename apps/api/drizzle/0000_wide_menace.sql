CREATE TABLE "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"deskripsi" text,
	"kategori" text,
	"tipe" text,
	"nominal" integer,
	"diajukan_oleh" text,
	"status" text DEFAULT 'Pending',
	"bukti_transfer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"bulan" text,
	"minggu_ke" integer,
	"status" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"username" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" integer,
	"before_value" text,
	"after_value" text,
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cash_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"bulan" text,
	"minggu_ke" integer,
	"status" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kelas" text,
	"status_kas" text DEFAULT 'Lunas',
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text,
	"amount" integer,
	"type" text,
	"category" text,
	"attachment_url" text,
	"member_id" integer,
	"status" text DEFAULT 'Pending',
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'Anggota' NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
