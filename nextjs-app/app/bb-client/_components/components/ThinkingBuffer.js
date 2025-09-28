'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ThinkingBuffer({ isShowingThinking, thinkingContent, thinkingStartTime, thinkingEndTime }) {
	if (!thinkingContent) return null;

	return (
		<div className="mb-3">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value="thinking" className="border border-border bg-card dark:bg-card rounded-lg">
					<AccordionTrigger className="px-4 py-3 hover:no-underline">
						<div className="flex items-center justify-between w-full">
							<div className="flex items-center">
								{isShowingThinking && (
									<div className="animate-pulse h-3 w-3 mr-2 bg-blue-500 rounded-full"></div>
								)}
								<span className="text-sm font-medium">AI thoughts</span>
							</div>
							<span className="text-xs text-muted-foreground mr-4">
								{(() => {
									if (thinkingStartTime) {
										const endTime = thinkingEndTime || Date.now();
										const duration = ((endTime - thinkingStartTime) / 1000).toFixed(1);
										return `${duration}s`;
									}
									return '0.0s';
								})()}
							</span>
						</div>
					</AccordionTrigger>
					<AccordionContent className="px-4 pb-4">
						<div className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-muted/30 dark:bg-muted/50 p-3 rounded border">
							{thinkingContent}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
} 