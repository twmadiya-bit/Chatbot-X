import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatbotsService } from './chatbots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { CreateChatbotDto, UpdateBrandingDto } from '@chatbot-x/shared';

@ApiTags('Chatbots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbots')
export class ChatbotsController {
  constructor(private readonly chatbotsService: ChatbotsService) {}

  @Get()
  @ApiOperation({ summary: 'List all chatbots for the tenant' })
  @ApiResponse({ status: 200, description: 'Returns list of chatbots' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.chatbotsService.findAll(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new chatbot' })
  @ApiResponse({ status: 201, description: 'Chatbot created' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateChatbotDto) {
    return this.chatbotsService.create(tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single chatbot by ID' })
  @ApiResponse({ status: 200, description: 'Returns chatbot details' })
  @ApiResponse({ status: 404, description: 'Chatbot not found' })
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chatbot fields' })
  @ApiResponse({ status: 200, description: 'Chatbot updated' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateChatbotDto>,
  ) {
    return this.chatbotsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a chatbot' })
  @ApiResponse({ status: 200, description: 'Chatbot archived' })
  archive(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.archive(tenantId, id);
  }

  @Patch(':id/branding')
  @ApiOperation({ summary: 'Update chatbot branding' })
  @ApiResponse({ status: 200, description: 'Branding updated' })
  updateBranding(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.chatbotsService.updateBranding(tenantId, id, dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a chatbot' })
  @ApiResponse({ status: 200, description: 'Chatbot activated' })
  @ApiResponse({ status: 403, description: 'Setup fee not paid or subscription inactive' })
  activate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.activate(tenantId, id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a chatbot' })
  @ApiResponse({ status: 200, description: 'Chatbot paused' })
  pause(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.pause(tenantId, id);
  }

  @Get(':id/entitlements')
  @ApiOperation({ summary: 'Get enabled feature entitlements for a chatbot' })
  @ApiResponse({ status: 200, description: 'Returns set of enabled feature keys' })
  async getEntitlements(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.chatbotsService.findById(tenantId, id);
    const entitlements = await this.chatbotsService.getEntitlements(id);
    return { entitlements: Array.from(entitlements) };
  }

  @Post(':id/regenerate-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate widget API key' })
  @ApiResponse({ status: 200, description: 'New API key generated' })
  regenerateApiKey(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.regenerateApiKey(tenantId, id);
  }
}
