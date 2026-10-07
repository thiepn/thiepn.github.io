import type { ProviderAccess, ProviderAdapter, ProviderId } from '../providers/types';
import { PrismProviderCoordinator, type PrismVisibleProviderOperation } from './provider-coordinator';
import type { PrismProviderHomeView } from './provider-home-view';

type Listener=(view:PrismProviderHomeView)=>void;
const key=(providerId:ProviderId,operation:PrismVisibleProviderOperation['operation'])=>`${providerId}:${operation}`;

export class PrismProviderRuntime {
  #coordinator=new PrismProviderCoordinator();
  #visible=new Map<string,PrismVisibleProviderOperation>();
  #listeners=new Set<Listener>();
  #refreshGeneration=0;

  subscribe(listener:Listener):()=>void {
    this.#listeners.add(listener);
    listener(this.#coordinator.snapshotView());
    return()=>this.#listeners.delete(listener);
  }

  setConnection(adapter:ProviderAdapter,access:ProviderAccess):void {
    this.#coordinator.setConnection(adapter,access);
    this.#publish();
  }

  removeConnection(providerId:ProviderId):void {
    this.#coordinator.removeConnection(providerId);
    for(const [entryKey,item] of this.#visible)if(item.providerId===providerId)this.#visible.delete(entryKey);
    this.#publish();
  }

  setVisible(providerId:ProviderId,operation:PrismVisibleProviderOperation['operation'],visible:boolean):void {
    const entryKey=key(providerId,operation);
    if(visible)this.#visible.set(entryKey,{providerId,operation});
    else this.#visible.delete(entryKey);
  }

  connectedProviders():readonly ProviderId[] {
    return this.#coordinator.connectedProviders();
  }

  view():PrismProviderHomeView {
    return this.#coordinator.snapshotView();
  }

  async refresh():Promise<void> {
    const generation=++this.#refreshGeneration;
    await this.#coordinator.refresh([...this.#visible.values()],view=>{
      if(generation!==this.#refreshGeneration)return;
      this.#publish(view);
    });
    if(generation===this.#refreshGeneration)this.#publish();
  }

  clear():void {
    ++this.#refreshGeneration;
    this.#visible.clear();
    this.#coordinator.clear();
    this.#publish();
  }

  #publish(view=this.#coordinator.snapshotView()):void {
    const snapshot=structuredClone(view);
    for(const listener of this.#listeners)listener(structuredClone(snapshot));
  }
}

export const prismProviderRuntime=new PrismProviderRuntime();
