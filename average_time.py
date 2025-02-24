import pandas as pd
import os

def calculate_generation_stats():
    try:
        # Read the CSV file with specified column names
        csv_path = os.path.join(os.getcwd(), 'generation-times.csv')
        df = pd.read_csv(csv_path, names=['timestamp', 'project', 'duration_seconds', 'success', 'version'])
        
        # Get user input for version
        print("\nAvailable versions:", df['version'].unique().tolist())
        version = input("Enter version to analyze (or 'all' for all versions): ").lower().strip()
        
        # Filter data based on version if not 'all'
        if version != 'all':
            df = df[df['version'] == version]
            if len(df) == 0:
                print(f"No data found for version {version}")
                return
        
        # Calculate statistics
        stats = {
            'Number of generations': len(df),
            'Average (mean) time': round(df['duration_seconds'].mean(), 2),
            'Median time': round(df['duration_seconds'].median(), 2),
            'Fastest time': round(df['duration_seconds'].min(), 2),
            'Slowest time': round(df['duration_seconds'].max(), 2)
        }
        
        # Print statistics
        print(f"\nGeneration Time Statistics {f'for {version}' if version != 'all' else '(all versions)'}:")
        for key, value in stats.items():
            print(f"{key}: {value} {'seconds' if 'time' in key.lower() else ''}")
            
    except FileNotFoundError:
        print("No generation times file found yet")
    except Exception as e:
        print(f"Error calculating statistics: {str(e)}")

if __name__ == "__main__":
    calculate_generation_stats()
