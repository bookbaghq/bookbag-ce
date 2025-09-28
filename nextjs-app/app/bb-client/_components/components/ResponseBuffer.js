'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { sanitizeHTML, containsRenderableHTML } from "../tools/htmlUtils";

export function ResponseBuffer({ contentParts, copiedCodeBlock, onCopyCodeBlock, onCopyMessage, isCopied, footer }) {
	if (!contentParts || contentParts.length === 0) return null;
	return (
		<Card className="p-4 relative group/message bg-muted/50">
			<div className="message-content">
				{contentParts.map((part) => {
					if (part.type === 'code') {
						return (
							<Card key={part.key} className="my-4 first:mt-0 last:mb-0 overflow-hidden">
								<div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
									<Badge variant="secondary" className="text-xs">
										{part.language}
									</Badge>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onCopyCodeBlock(part.content, part.index)}
										className="h-8 px-2"
									>
										{copiedCodeBlock === part.index ? (
											<>
												<Check className="w-3 h-3 mr-1" />
												<span className="text-xs">Copied!</span>
											</>
										) : (
											<>
												<Copy className="w-3 h-3 mr-1" />
												<span className="text-xs">Copy</span>
											</>
										)}
									</Button>
								</div>
								<div className="p-4 bg-muted/20">
									<pre className="text-sm overflow-x-auto">
										<code className={`language-${part.language}`}>
											{part.content}
										</code>
									</pre>
								</div>
							</Card>
						);
					} else {
						const shouldRenderHTML = containsRenderableHTML(part.content);
						if (shouldRenderHTML) {
							const sanitizedHTML = sanitizeHTML(part.content);
							return (
								<div 
									key={part.key} 
									className="whitespace-pre-wrap text-left message-html-content"
									dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
								/>
							);
						} else {
							return (
								<div key={part.key} className="whitespace-pre-wrap text-left">
									{part.content}
								</div>
							);
						}
					}
				})}
			</div>
			{footer}
			<Button
				variant="ghost"
				size="sm"
				onClick={onCopyMessage}
				className="absolute top-2 right-2 opacity-0 group-hover/message:opacity-100 transition-opacity h-8 w-8 p-0"
			>
				{isCopied ? (
					<Check className="w-3 h-3" />
				) : (
					<Copy className="w-3 h-3" />
				)}
			</Button>
		</Card>
	);
} 