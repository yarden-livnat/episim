# episim

### Data
Create a link to your data directory in the map directory
```
cd map
ln -s <path> data
```
The data directory should have subdirectories for different datasets. Regular files in the data directory will be ignored. Each subdirectory should include the files
* persons_ref.txt
* dendogram.txt

### Data preparation
note: this will take time
```
cd scripts
python post2.py <path-to-specific-data-subdirectory>
```

### run
```
cd maps
./run
```

open a browser at 'localhost:8890'
