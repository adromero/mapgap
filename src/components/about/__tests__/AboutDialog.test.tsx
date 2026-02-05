import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutDialog } from '../AboutDialog';

describe('AboutDialog', () => {
  it('renders the trigger element', () => {
    render(
      <AboutDialog>
        <button>About</button>
      </AboutDialog>
    );
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('opens dialog on trigger click and shows content', async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog>
        <button>About</button>
      </AboutDialog>
    );
    await user.click(screen.getByText('About'));
    expect(screen.getByText('About MapGap')).toBeInTheDocument();
    expect(screen.getByText('What is MapGap?')).toBeInTheDocument();
    expect(screen.getByText('Opportunity Score Formula')).toBeInTheDocument();
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
    expect(screen.getByText('Limitations')).toBeInTheDocument();
  });
});
