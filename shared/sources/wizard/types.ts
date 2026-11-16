// Types of the wizard sources (ported from legacy/src/views/Edit/Wizard/Sources).
import type { SourceCapability, SourceDevice, SourceInput, SourceSettings } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** What a wizard form works on: the legacy component props. */
export interface WizardProps {
	settings?: any;
	/** The slice of the core config of the source `type` (`config.source[type]`). */
	config?: any;
	skills?: any;
	/** `skills.sources[type]` */
	knownDevices?: SourceDevice[];
}

/** What a wizard form reports: the arguments of the legacy `onChange(type, settings, inputs, ready)`. */
export interface WizardChange {
	/** The id of the editor source the settings belong to. */
	type: string;
	settings: SourceSettings;
	inputs: SourceInput[];
	/** Whether the wizard may go on to probe the source. */
	ready: boolean;
}

export interface WizardSource {
	id: string;
	/** The editor source the wizard source configures; also the key of its config and known devices. */
	type: string;
	/** English name; translate with t(name). */
	name: string;
	capabilities: SourceCapability[];
	icon: string;
	/** The settings the form shows for the props. */
	initSettings: (initialSettings: any, context?: any) => SourceSettings;
	/** What the form reports when it is mounted. */
	change: (props: WizardProps) => WizardChange;
	/** What the form reports when the field `what` changes; checkboxes toggle and ignore the value. */
	update: (props: WizardProps, what: string, value?: unknown) => WizardChange;
}
