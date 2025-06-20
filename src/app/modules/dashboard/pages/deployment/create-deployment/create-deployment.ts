import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { DeploymentService } from '../../../services/deployment.service';
import { CookieService } from '../../../../../shared/services/cookie.service';
import {
  DeploymentModel,
  DeploymentFormData,
  DeploymentValidators,
  DeploymentMapper,
  ChatMessage,
  ArchitectureTemplate,
  ArchitectureComponent,
} from '../../../models/deployment.model';

// Import child components
import { ModeSelector } from './components/mode-selector/mode-selector';
import { QuickDeployment } from './components/quick-deployment/quick-deployment';
import { AiAssistant } from './components/ai-assistant/ai-assistant';
import { TemplateDeployment } from './components/template-deployment/template-deployment';
import { ExpertDeployment } from './components/expert-deployment/expert-deployment';

@Component({
  selector: 'app-create-deployment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModeSelector,
    QuickDeployment,
    AiAssistant,
    TemplateDeployment,
    ExpertDeployment,
  ],
  templateUrl: './create-deployment.html',
  styleUrl: './create-deployment.css',
})
export class CreateDeployment implements OnInit {
  // Public utilities for template
  public objectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  // Core state signals
  protected readonly deploymentMode = signal<DeploymentFormData['mode'] | null>(
    null
  );
  protected readonly loadingDeployment = signal<boolean>(false);
  protected readonly projectId = signal<string | null>(null);
  protected readonly errorMessages = signal<string[]>([]);
  protected readonly validationErrors = signal<string[]>([]);

  // AI Assistant state
  protected readonly aiPrompt = signal<string>('');
  protected readonly aiIsThinking = signal<boolean>(false);
  protected readonly chatMessages = signal<ChatMessage[]>([
    {
      sender: 'ai',
      text: "Bonjour ! Décrivez-moi l'infrastructure que vous souhaitez.",
    },
  ]);

  // Template mode state
  protected readonly availableTemplates = signal<ArchitectureTemplate[]>([]);
  protected readonly selectedTemplate = signal<ArchitectureTemplate | null>(
    null
  );

  // Expert mode state
  protected readonly expertSelectedProvider = signal<'aws' | 'gcp' | 'azure'>(
    'aws'
  );
  protected readonly expertSearchTerm = signal<string>('');
  protected readonly expertArchitecture = signal<ArchitectureComponent[]>([]);
  protected readonly activeExpertComponent =
    signal<ArchitectureComponent | null>(null);

  // Forms
  protected deploymentConfigForm: FormGroup;
  protected expertForm: FormGroup;

  // Git repository state
  protected readonly gitBranches = signal<string[]>([]);
  protected readonly loadingGitInfo = signal<boolean>(false);

  protected readonly isFormValid = computed(() => {
    const mode = this.deploymentMode();
    if (!mode) return false;

    const formData = this.getFormData();
    const basicErrors = DeploymentValidators.validateBasicInfo(formData);

    switch (mode) {
      case 'beginner':
      case 'template':
        return this.deploymentConfigForm.valid && basicErrors.length === 0;

      case 'assistant':
        return (
          this.deploymentConfigForm.valid &&
          basicErrors.length === 0 &&
          this.aiPrompt().trim().length > 0
        );

      case 'expert':
        const compErrors = DeploymentValidators.validateArchitectureComponents(
          this.expertArchitecture()
        );
        return (
          this.deploymentConfigForm.valid &&
          basicErrors.length === 0 &&
          compErrors.length === 0
        );

      default:
        return false;
    }
  });

  // Injected services
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cookieService = inject(CookieService);
  private readonly deploymentService = inject(DeploymentService);

  constructor() {
    this.deploymentConfigForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      environment: ['development', Validators.required],
      repoUrl: [''],
      branch: ['main'],
    });

    this.expertForm = this.formBuilder.group({});

    // Set up form validation
    this.setupFormValidation();
  }

  ngOnInit(): void {
    // Get project ID from cookies
    const projectId = this.cookieService.get('projectId');
    if (!projectId) {
      this.errorMessages.set([
        'No active project found. Please select a project first.',
      ]);
      this.router.navigate(['/projects']);
      return;
    }

    this.projectId.set(projectId);
  }

  // --- MODE SELECTION ---
  selectMode(mode: DeploymentFormData['mode']): void {
    console.log('Selected deployment mode:', mode);
    this.deploymentMode.set(mode);
    this.clearErrors();
    this.resetModeSpecificState();

    // Load templates for template mode
    if (mode === 'template') {
      this.loadAvailableTemplates();
    }
  }

  selectTemplate(template: ArchitectureTemplate): void {
    console.log('Selected template:', template);
    this.selectedTemplate.set(template);
  }

  // --- CHILD COMPONENT EVENT HANDLERS ---

  // Quick Deployment handlers
  protected handleQuickFetchGitBranches(): void {
    this.fetchGitBranches();
  }

  protected handleQuickCreateDeployment(): void {
    this.createDeployment();
  }

  protected handleQuickResetView(): void {
    this.resetView();
  }

  // AI Assistant handlers
  protected handleAiPromptChange(prompt: string): void {
    this.aiPrompt.set(prompt);
  }

  protected handleAiSendPrompt(): void {
    this.sendAiPrompt();
  }

  protected handleAiCreateDeployment(): void {
    this.createDeployment();
  }

  protected handleAiResetView(): void {
    this.resetView();
  }

  // Template handlers
  protected handleTemplateSelect(template: ArchitectureTemplate): void {
    this.selectTemplate(template);
  }

  protected handleTemplateCreateDeployment(): void {
    this.createDeployment();
  }

  protected handleTemplateResetView(): void {
    this.resetView();
  }

  protected handleTemplateBackToTemplates(): void {
    this.selectedTemplate.set(null);
  }

  // Expert mode handlers
  protected handleExpertProviderChange(
    provider: 'aws' | 'gcp' | 'azure'
  ): void {
    this.expertSelectedProvider.set(provider);
  }

  protected handleExpertSearchTermChange(term: string): void {
    this.expertSearchTerm.set(term);
  }

  protected handleExpertSelectComponent(
    component: ArchitectureComponent
  ): void {
    this.selectComponentForConfiguration(component);
  }

  protected handleExpertCreateDeployment(): void {
    this.createDeployment();
  }

  protected handleExpertResetView(): void {
    this.resetView();
  }

  // --- SETUP METHODS ---
  private setupFormValidation(): void {
    this.deploymentConfigForm.valueChanges.subscribe(() => {
      this.validateCurrentForm();
    });
  }

  private validateCurrentForm(): void {
    const mode = this.deploymentMode();
    if (!mode) return;

    const formData = this.getFormData();
    const errors: string[] = [];

    // Basic validation
    errors.push(...DeploymentValidators.validateBasicInfo(formData));

    // Git repository validation (if provided)
    if (formData.repoUrl) {
      const gitRepo = { url: formData.repoUrl, branch: formData.branch };
      errors.push(...DeploymentValidators.validateGitRepository(gitRepo));
    }

    // Mode-specific validation
    switch (mode) {
      case 'assistant':
        if (!this.aiPrompt().trim()) {
          errors.push('AI prompt is required for assistant mode');
        }
        break;

      case 'expert':
        errors.push(
          ...DeploymentValidators.validateArchitectureComponents(
            this.expertArchitecture()
          )
        );
        break;

      case 'template':
        if (!this.selectedTemplate()) {
          errors.push('Please select an architecture template');
        }
        break;
    }

    this.validationErrors.set(errors);
  }

  private loadAvailableTemplates(): void {
    // Mock data - replace with actual service call
    this.availableTemplates.set([
      {
        id: 'template-1',
        provider: 'aws',
        category: 'web',
        name: 'Full Stack Web App',
        description: 'Complete web application with database',
        tags: ['web', 'database', 'cdn'],
        icon: '🌐',
      },
      // Add more templates
    ]);
  }

  // --- GIT OPERATIONS ---
  protected fetchGitBranches(): void {
    const repoUrl = this.deploymentConfigForm.get('repoUrl')?.value;
    if (!repoUrl) return;

    this.loadingGitInfo.set(true);

    // Mock implementation - replace with actual service
    setTimeout(() => {
      this.gitBranches.set(['main', 'develop', 'feature/new-ui']);
      this.loadingGitInfo.set(false);
    }, 1500);
  }

  // --- AI ASSISTANT ---
  protected sendAiPrompt(): void {
    const prompt = this.aiPrompt().trim();
    if (!prompt) return;

    this.aiIsThinking.set(true);

    // Add user message
    this.chatMessages.update((messages) => [
      ...messages,
      { sender: 'user', text: prompt },
    ]);

    // Mock AI response - replace with actual service
    setTimeout(() => {
      this.chatMessages.update((messages) => [
        ...messages,
        {
          sender: 'ai',
          text: `Excellent ! Basé sur votre demande "${prompt}", je recommande une architecture avec AWS EC2, RDS et CloudFront.`,
        },
      ]);
      this.aiIsThinking.set(false);
      this.aiPrompt.set('');
    }, 2000);
  }

  protected selectComponentForConfiguration(
    component: ArchitectureComponent
  ): void {
    this.activeExpertComponent.set(component);
  }

  private getFormData(): DeploymentFormData {
    const mode = this.deploymentMode();
    const formValue = this.deploymentConfigForm.value;

    return {
      mode: mode!,
      name: formValue.name,
      environment: formValue.environment,
      repoUrl: formValue.repoUrl,
      branch: formValue.branch,
      templateId: this.selectedTemplate()?.id,
      aiPrompt: this.aiPrompt(),
      customComponents: this.expertArchitecture(),
    };
  }

  // --- DEPLOYMENT CREATION ---
  protected async createDeployment(): Promise<void> {
    if (!this.isFormValid() || !this.projectId()) {
      this.validateCurrentForm();
      return;
    }

    this.loadingDeployment.set(true);
    this.clearErrors();

    try {
      const formData = this.getFormData();
      const payload = DeploymentMapper.fromFormToPayload(
        formData,
        this.projectId()!
      );

      // Add expert mode configuration
      if (formData.mode === 'expert' && formData.customComponents) {
        payload.customArchitecture!.components = formData.customComponents.map(
          (comp) => ({
            instanceId: comp.instanceId,
            type: comp.id,
            config: this.expertForm.get(comp.instanceId)?.value || {},
          })
        );
      }

      console.log('🚀 Creating deployment with payload:', payload);
      console.log('📋 Form data used:', formData);

      // Call the deployment service - convert payload to DeploymentModel format
      const deploymentData: Partial<DeploymentModel> = {
        name: payload.name,
        environment: payload.environment,
        projectId: this.projectId()!,
        status: 'configuring',
        createdAt: new Date(),
        updatedAt: new Date(),
        gitRepository: payload.gitRepository as any, // Type assertion for now
        environmentVariables: payload.environmentVariables,
      };

      const deployment = await this.deploymentService
        .createDeployment(deploymentData)
        .toPromise();

      console.log('✅ Deployment created successfully:', deployment);
      console.log('📊 Deployment details:');
      console.table({
        ID: deployment?.id,
        Name: deployment?.name,
        Environment: deployment?.environment,
        Status: deployment?.status,
        'Created At': deployment?.createdAt,
        'Project ID': deployment?.projectId,
      });

      // Navigate to deployment list
      this.router.navigate(['/console/dashboard/deployments']);
    } catch (error) {
      console.error('❌ Error creating deployment:', error);
      this.errorMessages.set([
        'Failed to create deployment. Please try again.',
      ]);
    } finally {
      this.loadingDeployment.set(false);
    }
  }

  // --- UTILITY METHODS ---
  protected resetView(): void {
    this.deploymentMode.set(null);
    this.clearErrors();
    this.resetModeSpecificState();
  }

  private resetModeSpecificState(): void {
    // Reset AI Assistant state
    this.chatMessages.set([]);
    this.aiPrompt.set('');
    this.aiIsThinking.set(false);

    // Reset Template state
    this.selectedTemplate.set(null);

    // Reset Expert mode state
    this.expertSelectedProvider.set('aws');
    this.expertSearchTerm.set('');
    this.expertArchitecture.set([]);
    this.activeExpertComponent.set(null);

    // Reset form validation
    this.validateCurrentForm();
  }

  private clearErrors(): void {
    this.errorMessages.set([]);
    this.validationErrors.set([]);
  }
}
