/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 */

import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AgentScreenHost } from '../agent-screen-host.model';
import { AgentChatThreadComponent } from '../agent-chat-thread/agent-chat-thread.component';
import { AgentChatComposerComponent } from '../agent-chat-composer/agent-chat-composer.component';

@Component({
  selector: 'app-agent-chat-panel',
  standalone: true,
  imports: [CommonModule, AgentChatThreadComponent, AgentChatComposerComponent],
  templateUrl: './agent-chat-panel.component.html',
  styleUrls: ['./agent-chat-panel.component.scss'],
})
export class AgentChatPanelComponent {
  @Input({ required: true }) host!: AgentScreenHost;

  @ViewChild(AgentChatThreadComponent) private chatThread?: AgentChatThreadComponent;

  getChatScrollNative(): HTMLDivElement | undefined {
    return this.chatThread?.getScrollNative();
  }

  private scrollAnimFrame?: number;

  scrollChatToBottom(): void {
    const el = this.chatThread?.getScrollNative();
    if (!el) return;

    // Only scroll if the newest message's natural layout slot extends past the
    // visible viewport. We use offsetTop/offsetHeight (layout positions) rather
    // than getBoundingClientRect because the slide-in animation transforms the
    // element far below its slot, which would skew rect-based math.
    const lastMsg = el.lastElementChild as HTMLElement | null;
    if (!lastMsg) return;
    const slotBottom = lastMsg.offsetTop + lastMsg.offsetHeight;
    const visibleBottom = el.scrollTop + el.clientHeight;
    const delta = slotBottom - visibleBottom;
    if (delta <= 1) return;

    const start = el.scrollTop;

    // Match the message slide-in keyframe (0.592s ease-out) so the scroll and
    // the new message's translateY land at the same instant.
    const duration = 592;
    const startTime = performance.now();
    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

    if (this.scrollAnimFrame !== undefined) cancelAnimationFrame(this.scrollAnimFrame);

    // Mark the scroll as programmatic so the (scroll) handler doesn't flip
    // chatAtBottom to false mid-animation and disable future auto-scrolls.
    el.dataset['programmaticScroll'] = '1';

    const step = (now: number): void => {
      const t = Math.min(1, (now - startTime) / duration);
      el.scrollTop = start + delta * easeOut(t);
      if (t < 1) {
        this.scrollAnimFrame = requestAnimationFrame(step);
      } else {
        this.scrollAnimFrame = undefined;
        delete el.dataset['programmaticScroll'];
      }
    };
    this.scrollAnimFrame = requestAnimationFrame(step);
  }

  onTextChange(value: string): void {
    this.host.chatInput = value;
    this.host.cdr.markForCheck();
  }
}
