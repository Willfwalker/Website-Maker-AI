import pandas as pd
import os

def calculate_generation_stats():
    try:
        # Read the CSV file
        csv_path = os.path.join(os.getcwd(), 'generation-times.csv')
        df = pd.read_csv(csv_path)
        
        # Calculate statistics
        stats = {
            'Number of generations': len(df),
            'Average (mean) time': round(df['duration_seconds'].mean(), 2),
            'Median time': round(df['duration_seconds'].median(), 2),
            'Fastest time': round(df['duration_seconds'].min(), 2),
            'Slowest time': round(df['duration_seconds'].max(), 2)
        }
        
        # Print statistics
        print("\nGeneration Time Statistics:")
        for key, value in stats.items():
            print(f"{key}: {value} {'seconds' if 'time' in key.lower() else ''}")
            
        # Success rate calculation
        success_rate = (df['success'].value_counts(normalize=True).get(True, 0) * 100)
        print(f"Success rate: {round(success_rate, 1)}%")
        
    except FileNotFoundError:
        print("No generation times file found yet")
    except Exception as e:
        print(f"Error calculating statistics: {str(e)}")

if __name__ == "__main__":
    calculate_generation_stats()
