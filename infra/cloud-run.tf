resource "google_cloud_run_v2_service" "frontend" {
  name     = "knowyourself"
  location = var.region
  project  = var.project_id

  template {
    service_account = data.google_service_account.runtime.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/knowyourself/web:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # Throttle CPU when idle - only billed during request processing.
        cpu_idle = true
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://api.${var.domain}/api/v1"
      }

      startup_probe {
        http_get {
          path = "/"
        }
        initial_delay_seconds = 3
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    timeout = "30s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
