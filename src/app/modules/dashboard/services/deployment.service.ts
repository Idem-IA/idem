import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  DeploymentModel,
  QuickDeploymentModel,
  TemplateDeploymentModel,
  AiAssistantDeploymentModel,
  ExpertDeploymentModel,
  ChatMessage,
} from '../models/deployment.model';

// Interfaces nécessaires après la suppression de deployment.api.model.ts
interface GitRepositoryValidationRequest {
  repoUrl: string;
  accessToken?: string;
}

interface GitRepositoryValidationResponse {
  valid: boolean;
  branches: string[];
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DeploymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.services.api.url}/project`;

  /**
   * Create a new quick deployment
   * @param deployment The quick deployment configuration
   */
  createQuickDeployment(
    deployment: Partial<QuickDeploymentModel>
  ): Observable<QuickDeploymentModel> {
    console.log('Creating quick deployment:', deployment);
    return this.createDeployment<QuickDeploymentModel>(deployment);
  }

  /**
   * Create a new template-based deployment
   * @param deployment The template deployment configuration
   */
  createTemplateDeployment(
    deployment: Partial<TemplateDeploymentModel>
  ): Observable<TemplateDeploymentModel> {
    console.log('Creating template deployment:', deployment);
    return this.createDeployment<TemplateDeploymentModel>(deployment);
  }

  /**
   * Create a new AI assistant deployment
   * @param deployment The AI assistant deployment configuration
   */
  createAiAssistantDeployment(
    deployment: Partial<AiAssistantDeploymentModel>
  ): Observable<AiAssistantDeploymentModel> {
    console.log('Creating AI assistant deployment:', deployment);
    return this.createDeployment<AiAssistantDeploymentModel>(deployment);
  }

  /**
   * Create a new expert deploymentƒ√
   * @param deployment The expert deployment configuration
   */
  createExpertDeployment(
    deployment: Partial<ExpertDeploymentModel>
  ): Observable<ExpertDeploymentModel> {
    console.log('Creating expert deployment:', deployment);
    return this.createDeployment<ExpertDeploymentModel>(deployment);
  }

  /**
   * Create a new deployment
   * @param deployment The deployment configuration
   */
  private createDeployment<T extends DeploymentModel>(
    deployment: Partial<T>
  ): Observable<T> {
    console.log('Creating deployment:', deployment);
    return this.http.post<T>(`${this.apiUrl}/deployments/create`, deployment).pipe(
      tap((createdDeployment) =>
        console.log('Created deployment', createdDeployment)
      ),
      catchError((error) => {
        console.error('Error creating deployment', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all deployments for a project
   * @param projectId The ID of the project
   */
  getProjectDeployments(projectId: string): Observable<DeploymentModel[]> {
    return this.http.get<DeploymentModel[]>(
      `${this.apiUrl}/deployments/${projectId}`
    ).pipe(
      tap((deployments) => console.log('Fetched deployments', deployments)),
      catchError((error) => {
        console.error('Error fetching deployments', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a deployment by its ID
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   */
  getDeploymentById(
    projectId: string,
    deploymentId: string
  ): Observable<DeploymentModel> {
    return this.http
      .get<DeploymentModel>(
        `${this.apiUrl}/deployments/${projectId}/${deploymentId}`
      )
      .pipe(
        tap((deployment) => console.log('Fetched deployment', deployment)),
        catchError((error) => {
          console.error('Error fetching deployment', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update an existing deployment configuration
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
    );
  }

  /**
   * Update an existing deployment configuration
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   * @param updates The deployment updates
   */
  updateDeployment(
    projectId: string,
    deploymentId: string,
    updates: Partial<DeploymentModel>
  ): Observable<DeploymentModel> {
    return this.http
      .patch<DeploymentModel>(
        `${this.apiUrl}/projects/${projectId}/deployments/${deploymentId}`,
        updates
      )
      .pipe(
        tap((updatedDeployment) =>
          console.log('Updated deployment', updatedDeployment)
        ),
        catchError((error) => {
          console.error('Error updating deployment', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Cancel an ongoing deployment
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   */
  cancelDeployment(
    projectId: string,
    deploymentId: string
  ): Observable<DeploymentModel> {
    return this.http
      .post<DeploymentModel>(
        `${this.apiUrl}/projects/${projectId}/deployments/${deploymentId}/cancel`,
        {}
      )
      .pipe(
        tap((deployment) => console.log('Cancelled deployment', deployment)),
        catchError((error) => {
          console.error('Error cancelling deployment', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Trigger a redeployment of an existing deployment
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   */
  redeployDeployment(
    projectId: string,
    deploymentId: string
  ): Observable<DeploymentModel> {
    return this.http
      .post<DeploymentModel>(
        `${this.apiUrl}/projects/${projectId}/deployments/${deploymentId}/redeploy`,
        {}
      )
      .pipe(
        tap((deployment) => console.log('Redeployed', deployment)),
        catchError((error) => {
          console.error('Error redeploying', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get deployment logs
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   */
  getDeploymentLogs(
    projectId: string,
    deploymentId: string
  ): Observable<string> {
    return this.http
      .get(
        `${this.apiUrl}/projects/${projectId}/deployments/${deploymentId}/logs`,
        { responseType: 'text' }
      )
      .pipe(
        tap((logs) => console.log('Fetched logs')),
        catchError((error) => {
          console.error('Error fetching logs', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Validate Git repository and fetch available branches
   * @param repoUrl The repository URL
   * @param accessToken Optional access token for private repositories
   */
  validateGitRepository(
    repoUrl: string,
    accessToken?: string
  ): Observable<string[]> {
    const request: GitRepositoryValidationRequest = {
      repoUrl,
      accessToken,
    };

    return this.http
      .post<string[]>(`${this.apiUrl}/git/validate`, request)
      .pipe(
        tap((branches) => console.log('Fetched branches', branches)),
        catchError((error) => {
          console.error('Error validating repository', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get cloud provider regions
   * @param provider The cloud provider type
   */
  getProviderRegions(
    provider: 'aws' | 'gcp' | 'azure'
  ): Observable<{ id: string; name: string }[]> {
    return this.http
      .get<{ id: string; name: string }[]>(
        `${this.apiUrl}/cloud/${provider}/regions`
      )
      .pipe(
        tap((regions) => console.log(`Fetched ${provider} regions`, regions)),
        catchError((error) => {
          console.error(`Error fetching ${provider} regions`, error);
          return throwError(() => error);
        })
      );
  }

  sendChatMessage(
    message: ChatMessage,
    projectId: string
  ): Observable<ChatMessage> {
    return this.http
      .post<ChatMessage>(`${this.apiUrl}/deployments/chat`, {
        message,
        projectId,
      })
      .pipe(
        // Process the response to ensure code blocks are properly formatted as markdown
        map((response) => {
          // If the response contains code blocks, ensure they're properly formatted
          if (response.sender === 'ai') {
            console.log('Processing AI response for markdown formatting');

            // Ensure code blocks are properly formatted with language identifiers
            // This regex finds code blocks that might not have language specifiers
            response.text = response.text.replace(
              /```(\s*)(\w+)?\s*([\s\S]*?)```/g,
              (match, space, lang, code) => {
                // If language is not specified, try to detect it or default to text
                const language = lang || 'text';
                return `\`\`\`${language}\n${code}\`\`\``;
              }
            );

            // Ensure inline code is properly formatted
            response.text = response.text.replace(
              /`([^`]+)`/g,
              (match, code) => {
                return `\`${code}\``;
              }
            );
          }
          return response;
        }),
        tap((message) => console.log('Fetched message', message)),
        catchError((error) => {
          console.error('Error fetching message', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Generate a deployment pipeline for an existing deployment
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   */
  generatePipeline(
    projectId: string,
    deploymentId: string
  ): Observable<DeploymentModel> {
    return this.http
      .post<DeploymentModel>(
        `${this.apiUrl}/deployments/startPipeline/${deploymentId}`,
        {}
      )
      .pipe(
        tap((deployment) =>
          console.log('Generated pipeline for deployment', deployment)
        ),
        catchError((error) => {
          console.error('Error generating pipeline', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Generate Terraform files for an existing deployment
   * @param projectId The ID of the project
   * @param deploymentId The ID of the deployment
   */
  generateTerraformFiles(
    projectId: string,
    deploymentId: string
  ): Observable<DeploymentModel> {
    return this.http
      .post<DeploymentModel>(`${this.apiUrl}/deployments/generate`, {
        projectId,
        deploymentId,
      })
      .pipe(
        tap((deployment) =>
          console.log('Generated Terraform files for deployment', deployment)
        ),
        catchError((error) => {
          console.error('Error generating Terraform files', error);
          return throwError(() => error);
        })
      );
  }
}
