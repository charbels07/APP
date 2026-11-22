/**
 * A board that cannot be drawn (a part of the profile the app did not expect, a fault in a
 * screen) must not leave an empty page: this catches the failure around the whole board and
 * offers to try again or, to those who manage the profile, to put back an earlier version of
 * the board (the same list as Settings → Account). Nothing is erased here.
 */
import React from 'react';
import { backupStrings } from '../i18n/backup';
import { reportProblem } from '../lib/product';
import { useBoard } from '../state/BoardContext';
import { useSession } from '../state/Session';
import { Btn } from './common';
import { BoardVersions } from './settings/Backups';
import { StartLayout, T } from './start/StartLayout';

interface State {
  failed: boolean;
  /** Changes at each "Try again": the board is drawn anew from the profile as it is now. */
  round: number;
}

export class BoardRescue extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false, round: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // For the app's team (families who agreed): that it happened and where in the code, never what was on the board.
    reportProblem('crash', error);
  }

  render() {
    if (this.state.failed) return <RescueScreen onRetry={() => this.setState((s) => ({ failed: false, round: s.round + 1 }))} />;
    return <React.Fragment key={this.state.round}>{this.props.children}</React.Fragment>;
  }
}

function RescueScreen({ onRetry }: { onRetry: () => void }) {
  const sess = useSession();
  const board = useBoard();
  const t = backupStrings(sess.uiLang);
  return (
    <StartLayout title={t.rescueTitle}>
      <T>{board?.manager ? t.rescueNote : t.rescueAsk}</T>
      <Btn kind="primary" icon="undo" label={t.rescueRetry} onPress={onRetry} />
      {board && <BoardVersions board={board} />}
    </StartLayout>
  );
}
