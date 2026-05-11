-- CreateEnum
CREATE TYPE "AlertRecommendationType" AS ENUM ('EXPIRATION', 'LOW_STOCK');

-- CreateTable
CREATE TABLE "alert_recommendations" (
    "id" TEXT NOT NULL,
    "alert_key" TEXT NOT NULL,
    "alert_type" "AlertRecommendationType" NOT NULL,
    "context_signature" TEXT NOT NULL,
    "batch_id" TEXT,
    "product_id" TEXT,
    "accion_inmediata" TEXT NOT NULL,
    "canal_sugerido" TEXT NOT NULL,
    "descuento_pct" INTEGER NOT NULL,
    "cliente_objetivo" TEXT NOT NULL,
    "justificacion_estacional" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_recommendations_alert_key_key" ON "alert_recommendations"("alert_key");

-- AddForeignKey
ALTER TABLE "alert_recommendations" ADD CONSTRAINT "alert_recommendations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_recommendations" ADD CONSTRAINT "alert_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
